import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Res, UnauthorizedException, forwardRef } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { TenantMembershipsService } from '../tenant-memberships/tenant-memberships.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split('@');
  if (domain === 'gmail.com') return `${local.replace(/\./g, '')}@${domain}`;
  return `${local}@${domain}`;
}

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
      prompt: 'select_account',
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
      if (normalizeEmail(email) !== normalizeEmail(invitation.email)) {
        return errorRedirect('email_mismatch');
      }

      // Find or create user (no password for Google users)
      const displayName = invitation.memberName || name;
      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.create({ name: displayName, email, globalRole: Role.User });
      } else if (invitation.memberName) {
        await this.usersService.updateProfile(user.id, invitation.memberName);
        user = { ...user, name: invitation.memberName };
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
      // Invited users always go to dashboard — onboarding is the owner's responsibility
      res.cookie('inv360_role', user.globalRole, cookieBase);
      res.cookie('inv360_onboarded', 'true', cookieBase);

      res.redirect(`${frontendUrl}/dashboard`);
    } catch {
      return errorRedirect('google_failed');
    }
  }

  // ── Mobile: pending invitations for the current user ───────────────────────

  @Get('mine')
  async mine(@CurrentUser() user: RequestUser) {
    const invitations = await this.invitationsService.findAllPendingByEmail(user.email);
    const now = new Date();
    const valid = invitations.filter((inv) => inv.expiresAt > now);

    const results = await Promise.all(
      valid.map(async (inv) => {
        const tenant = await this.tenantsService.findById(inv.tenantId);
        return {
          id: inv.id,
          tenantId: inv.tenantId,
          tenantName: tenant?.name ?? '',
          role: inv.role,
          expiresAt: inv.expiresAt,
        };
      }),
    );
    return results;
  }

  @Post(':id/accept-mine')
  async acceptMine(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const invitation = await this.invitationsService.findById(id);
    if (!invitation) throw new BadRequestException('Invitación no encontrada');
    if (invitation.acceptedAt) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('La invitación expiró');
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new UnauthorizedException('Esta invitación no te pertenece');
    }

    const existing = await this.membershipsService.findMembership(user.id, invitation.tenantId);
    if (!existing) {
      await this.membershipsService.create({
        userId: user.id,
        tenantId: invitation.tenantId,
        role: invitation.role,
      });
    }
    await this.invitationsService.markAccepted(invitation.id);

    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
      activeTenantId: invitation.tenantId,
      tenantRole: invitation.role,
    });

    return { ok: true, access_token };
  }
}
