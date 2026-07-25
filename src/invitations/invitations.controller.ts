import { Body, Controller, Get, Inject, Param, Post, Query, Res, forwardRef } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TenantsService))
    private readonly tenantsService: TenantsService,
    private readonly membershipsService: TenantMembershipsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('validate/:token')
  async validate(@Param('token') token: string) {
    const invitation = await this.invitationsService.validate(token);
    const tenant = await this.tenantsService.findById(invitation.tenantId);
    return {
      email: invitation.email,
      tenantName: tenant?.name ?? '',
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  @Public()
  @Post('accept/:token')
  async accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    const invitation = await this.invitationsService.validate(token);

    let user = await this.usersService.findByEmail(invitation.email);
    if (!user) {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      user = await this.usersService.create({
        name: dto.name,
        email: invitation.email,
        password: hashedPassword,
        globalRole: Role.User,
      });
    }

    await this.membershipsService.create({
      userId: user.id,
      tenantId: invitation.tenantId,
      role: invitation.role,
    });

    await this.invitationsService.markAccepted(invitation.id);

    return { ok: true };
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  @Public()
  @Get('google')
  googleStart(@Query('token') token: string, @Res() res: Response) {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: `${this.config.getOrThrow<string>('API_URL')}/invitations/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: token,
      access_type: 'online',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') invitationToken: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const errorRedirect = (msg: string) =>
      res.redirect(`${frontendUrl}/login/invitation?token=${invitationToken}&error=${msg}`);

    try {
      // Exchange authorization code for access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
          redirect_uri: `${this.config.getOrThrow<string>('API_URL')}/invitations/google/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const { access_token } = (await tokenRes.json()) as { access_token: string };
      if (!access_token) return errorRedirect('google_failed');

      // Get user profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { email, name } = (await profileRes.json()) as { email: string; name: string };
      if (!email) return errorRedirect('google_failed');

      // Validate invitation token
      const invitation = await this.invitationsService.validate(invitationToken);

      // Email must match invitation
      if (email.toLowerCase() !== invitation.email.toLowerCase()) {
        return errorRedirect('email_mismatch');
      }

      // Find or create user (no password for Google users)
      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.create({ name, email, globalRole: Role.User });
      }

      // Create membership (idempotent: throws ConflictException if already member)
      try {
        await this.membershipsService.create({
          userId: user.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
        });
      } catch {
        // Already a member — still proceed to accept invitation and log in
      }

      await this.invitationsService.markAccepted(invitation.id);

      // Look up tenant to know its onboarding status
      const tenant = await this.tenantsService.findById(invitation.tenantId);

      // Sign JWT
      const jwtToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        globalRole: user.globalRole,
        activeTenantId: invitation.tenantId,
        tenantRole: invitation.role,
      });

      const isProd = process.env.NODE_ENV === 'production';
      const cookieBase = {
        httpOnly: false as const,
        secure: isProd,
        sameSite: 'lax' as const,
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      };

      // Set JWT (httpOnly)
      res.cookie('inv360_token', jwtToken, { ...cookieBase, httpOnly: true });
      // Set role & onboarding cookies (readable by Next.js proxy)
      res.cookie('inv360_role', user.globalRole, cookieBase);
      res.cookie('inv360_onboarded', String(tenant?.isOnboarded ?? false), cookieBase);

      const destination = tenant?.isOnboarded ? `${frontendUrl}/dashboard` : `${frontendUrl}/onboarding`;
      res.redirect(destination);
    } catch {
      return errorRedirect('google_failed');
    }
  }
}
