/**
 * Card — Nganya display card component.
 * Variants: compact (horizontal), standard (vertical), feature (hero-sized).
 * Glass panel style with image gradient overlay for readability.
 */

import type { MouseEvent, ReactNode } from "react";
import { Heart, Eye, Clock } from "lucide-react";
import LiveBadge from "./LiveBadge";
import Chip from "./Chip";
import Button from "./Button";
import type { Nganya } from "../../lib/mockData";
import { vibeTagColors } from "../../lib/mockData";
import { Link } from "@tanstack/react-router";
import { ResponsiveNganyaImage } from "./ResponsiveNganyaImage";

interface CardAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
}

interface CardBadge {
  label: string;
  className?: string;
}

interface CardProps {
  nganya: Nganya;
  variant?: "compact" | "standard" | "feature";
  onFollow?: (id: string) => void;
  isFollowing?: boolean;
  isMutating?: boolean;
  className?: string;
  subtitle?: string;
  imageBadge?: CardBadge | null;
  extraTag?: CardBadge | null;
  primaryAction?: CardAction | null;
  secondaryAction?: CardAction | null;
  footerContent?: ReactNode;
}

export default function Card({
  nganya,
  variant = "standard",
  onFollow,
  isFollowing = false,
  isMutating = false,
  className = "",
  subtitle,
  imageBadge,
  extraTag,
  primaryAction,
  secondaryAction,
  footerContent,
}: CardProps) {
  if (variant === "compact")
    return (
      <CompactCard
        nganya={nganya}
        isFollowing={isFollowing}
        onFollow={onFollow}
        className={className}
      />
    );
  if (variant === "feature")
    return (
      <FeatureCard
        nganya={nganya}
        isFollowing={isFollowing}
        onFollow={onFollow}
        className={className}
      />
    );
  return (
    <StandardCard
        nganya={nganya}
        isFollowing={isFollowing}
        isMutating={isMutating}
        onFollow={onFollow}
        className={className}
        subtitle={subtitle}
        imageBadge={imageBadge}
        extraTag={extraTag}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        footerContent={footerContent}
      />
    );
}

/* ─── Standard Card ───────────────────────────────────────── */
function StandardCard({
  nganya,
  isFollowing,
  isMutating,
  onFollow,
  className,
  subtitle,
  imageBadge,
  extraTag,
  primaryAction,
  secondaryAction,
  footerContent,
}: CardProps) {
  const handleActionClick =
    (handler?: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handler?.();
    };

  return (
    <Link
      to="/nganya/$slug"
      params={{ slug: nganya.slug }}
      className={`group block rounded-[var(--radius-lg)] overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all duration-200 hover:-translate-y-0.5 no-underline ${className}`}
    >
      {/* Image area */}
      <div className="relative h-44 overflow-hidden">
        <ResponsiveNganyaImage
          src={nganya.imageUrl}
          alt={nganya.name}
          variant="standard"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay for text readability */}
        <div className="card-image-overlay absolute inset-0" />

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {imageBadge ? (
            <span
              className={`max-w-[10rem] truncate rounded-[var(--radius-full)] border px-2.5 py-1 text-[10px] font-bold ${imageBadge.className || ""}`}
            >
              {imageBadge.label}
            </span>
          ) : null}
          {nganya.isLive && <LiveBadge />}
          {nganya.isNewBuild && (
            <span className="animate-shimmer px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-bold tracking-wider uppercase border border-[rgba(57,255,20,0.2)]">
              New Build
            </span>
          )}
        </div>

        {/* Follow button on image */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFollow?.(nganya.id);
          }}
          disabled={isMutating}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-150 cursor-pointer ${
            isFollowing
              ? "bg-[var(--color-accent)] text-white shadow-[var(--glow-accent-sm)]"
              : "bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70"
          } ${isMutating ? "opacity-70 cursor-wait" : ""}`}
          aria-label={isFollowing ? "Unfollow" : "Follow"}
        >
          {isMutating ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Heart
              className="w-4 h-4"
              fill={isFollowing ? "currentColor" : "none"}
            />
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-h4 text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
            {nganya.name}
          </h3>
        </div>

        {/* Route chip + stats */}
        <div className="flex items-center gap-2 mb-3 text-[var(--color-text-tertiary)]">
          <span className="text-body-sm truncate">
            {subtitle || nganya.corridor}
          </span>
        </div>

        {/* Vibe tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {nganya.vibeTags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              variant="vibe"
              color={vibeTagColors[tag]}
            />
          ))}
          {extraTag ? (
            <span
              className={`inline-flex items-center rounded-[var(--radius-full)] border px-3 py-1 text-[10px] font-bold ${extraTag.className || ""}`}
            >
              {extraTag.label}
            </span>
          ) : null}
        </div>

        {primaryAction || secondaryAction ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {primaryAction ? (
              <Button
                variant={primaryAction.variant || "primary"}
                className="w-full"
                isLoading={primaryAction.isLoading}
                onClick={handleActionClick(primaryAction.onClick)}
              >
                {primaryAction.label}
              </Button>
            ) : (
              <span className="h-11 rounded-[var(--radius-md)] border border-transparent" />
            )}

            {secondaryAction ? (
              <Button
                variant={secondaryAction.variant || "secondary"}
                className="w-full"
                isLoading={secondaryAction.isLoading}
                onClick={handleActionClick(secondaryAction.onClick)}
              >
                {secondaryAction.label}
              </Button>
            ) : (
              <span className="h-11 rounded-[var(--radius-md)] border border-transparent" />
            )}
          </div>
        ) : null}

        {/* Stats row */}
        {footerContent ? (
          footerContent
        ) : (
          <div className="flex items-center gap-4 text-[var(--color-text-tertiary)] text-xs">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {nganya.followers?.toLocaleString() ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {nganya.sightingsToday ?? 0} today
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {nganya.lastSeen}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Compact Card (horizontal) ───────────────────────────── */
function CompactCard({ nganya, isFollowing, onFollow, className }: CardProps) {
  return (
    <Link
      to="/nganya/$slug"
      params={{ slug: nganya.slug }}
      className={`group flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 no-underline ${className}`}
    >
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-[var(--radius-md)] overflow-hidden shrink-0">
        <ResponsiveNganyaImage
          src={nganya.imageUrl}
          alt={nganya.name}
          variant="compact"
          className="w-full h-full object-cover"
        />
        {nganya.isLive && (
          <div className="absolute bottom-0.5 right-0.5">
            <LiveBadge compact />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
          {nganya.name}
        </h4>
        <p className="text-xs text-[var(--color-text-tertiary)] truncate">
          {nganya.corridor}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-tertiary)]">
          <span>{nganya.followers?.toLocaleString() ?? 0} followers</span>
          <span>·</span>
          <span>{nganya.lastSeen}</span>
        </div>
      </div>

      {/* Follow */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFollow?.(nganya.id);
        }}
        className={`shrink-0 p-2 rounded-full transition-all cursor-pointer ${
          isFollowing
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]"
        }`}
        aria-label={isFollowing ? "Unfollow" : "Follow"}
      >
        <Heart
          className="w-4 h-4"
          fill={isFollowing ? "currentColor" : "none"}
        />
      </button>
    </Link>
  );
}

/* ─── Feature Card (hero-sized) ───────────────────────────── */
function FeatureCard({ nganya, isFollowing, onFollow, className }: CardProps) {
  return (
    <Link
      to="/nganya/$slug"
      params={{ slug: nganya.slug }}
      className={`group relative block rounded-[var(--radius-xl)] overflow-hidden min-h-[280px] md:min-h-[340px] no-underline ${className}`}
    >
      {/* Full-bleed image */}
      <ResponsiveNganyaImage
        src={nganya.imageUrl}
        alt={nganya.name}
        variant="feature"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {nganya.isLive && <LiveBadge />}
        {nganya.isNewBuild && (
          <span className="animate-shimmer px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-bold tracking-wider uppercase border border-[rgba(57,255,20,0.2)]">
            New Build
          </span>
        )}
      </div>

      {/* Follow button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFollow?.(nganya.id);
        }}
        className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
          isFollowing
            ? "bg-[var(--color-accent)] text-white shadow-[var(--glow-accent-sm)]"
            : "bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70"
        }`}
        aria-label={isFollowing ? "Unfollow" : "Follow"}
      >
        <Heart
          className="w-5 h-5"
          fill={isFollowing ? "currentColor" : "none"}
        />
      </button>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {nganya.vibeTags?.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              variant="vibe"
              color={vibeTagColors[tag]}
            />
          ))}
        </div>
        <h2 className="text-h2 text-white mb-1">{nganya.name}</h2>
        <p className="text-body-sm text-white/70 mb-3">{nganya.corridor}</p>
        <div className="flex items-center gap-4 text-white/60 text-xs">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {nganya.followers?.toLocaleString() ?? 0} followers
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {nganya.sightingsToday ?? 0} spotted today
          </span>
        </div>
      </div>
    </Link>
  );
}


