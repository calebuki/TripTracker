"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Maximize2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  EyeOff,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isMomentVideo } from "@/lib/media";
import { getTripRepository } from "@/lib/repositories";
import { formatLastUpdated, formatMomentTimes } from "@/lib/time";
import { cn } from "@/lib/utils";
import type {
  Moment,
  MomentComment,
  MomentCommentAuthorKind,
  Trip,
} from "@/types/crumbs";

interface MomentBottomSheetProps {
  trip: Trip;
  moments: Moment[];
  selectedMomentId: string | null;
  open: boolean;
  canManage?: boolean;
  carouselTitle?: string;
  onClose: () => void;
  onSelectMoment?: (momentId: string) => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}

function MomentComments({
  authorKind,
  moment,
  trip,
}: {
  authorKind: MomentCommentAuthorKind;
  moment: Moment;
  trip: Trip;
}) {
  const [commentsResult, setCommentsResult] = useState<{
    momentId: string;
    comments: MomentComment[] | null;
  }>({
    momentId: moment.id,
    comments: null,
  });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const trimmedDraft = draft.trim();
  const comments =
    commentsResult.momentId === moment.id ? commentsResult.comments : null;
  const visibleComments = comments ?? [];
  const loading = comments === null;

  function isMissingCommentsTableError(error: unknown) {
    return (
      error instanceof Error &&
      error.message.includes("moment_comments") &&
      error.message.includes("schema cache")
    );
  }

  useEffect(() => {
    let mounted = true;

    void getTripRepository()
      .listMomentComments(moment.id)
      .then((nextComments) => {
        if (mounted) {
          setCommentsResult({
            momentId: moment.id,
            comments: nextComments,
          });
        }
      })
      .catch((error) => {
        if (mounted) {
          setCommentsResult({
            momentId: moment.id,
            comments: [],
          });

          if (!isMissingCommentsTableError(error)) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Crumbs could not load comments.",
            );
          }
        }
      });

    return () => {
      mounted = false;
    };
  }, [moment.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedDraft) {
      toast.error("Write a comment before posting.");
      return;
    }

    setSaving(true);

    try {
      const comment = await getTripRepository().createMomentComment({
        tripId: trip.id,
        momentId: moment.id,
        authorKind,
        body: trimmedDraft,
      });

      setCommentsResult((current) => ({
        momentId: moment.id,
        comments:
          current.momentId === moment.id && current.comments
            ? [...current.comments, comment]
            : [comment],
      }));
      setDraft("");
      toast.success("Comment posted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not post this comment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 space-y-3 border-t border-black/5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-medium text-[var(--ink)]">Comments</p>
        </div>
        {visibleComments.length > 0 ? (
          <Badge variant="subtle">{visibleComments.length}</Badge>
        ) : null}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 rounded-[22px] bg-[var(--paper)] px-4 py-3 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        ) : visibleComments.length > 0 ? (
          visibleComments.map((comment) => (
            <div
              className="rounded-[22px] bg-[var(--paper)] px-4 py-3"
              key={comment.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="font-mono"
                  variant={comment.authorKind === "traveler" ? "accent" : "subtle"}
                >
                  {comment.authorLabel}
                </Badge>
                <span className="text-xs text-slate-500">
                  {formatLastUpdated(comment.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
                {comment.body}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-[22px] bg-[var(--paper)] px-4 py-3 text-sm text-slate-600">
            No comments yet.
          </p>
        )}
      </div>

      <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
        <Textarea
          className="min-h-20 rounded-[22px]"
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a comment"
          rows={2}
          value={draft}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {authorKind === "traveler" ? "Posting as OP" : "Posting anonymously"}
          </p>
          <Button disabled={saving || !trimmedDraft} size="sm" type="submit">
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post
          </Button>
        </div>
      </form>
    </section>
  );
}

function MomentSheetSlide({
  moment,
  trip,
  canManage,
  onClose,
  onOpenPhotoViewer,
  onEdit,
  onHide,
  onDelete,
}: {
  moment: Moment;
  trip: Trip;
  canManage: boolean;
  onClose: () => void;
  onOpenPhotoViewer: (moment: Moment) => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}) {
  const times = formatMomentTimes(moment, trip.timezone);
  const isVideoMoment = isMomentVideo(moment);
  const tripTimeLabel =
    trip.coverLocationName?.split(",")[0]?.trim() ||
    trip.timezone.split("/").at(-1)?.replace(/_/g, " ") ||
    "Trip";

  return (
    <article className="w-full shrink-0 snap-center px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="accent">
              {moment.type === "photo"
                ? isVideoMoment
                  ? "Video"
                  : "Photo"
                : "Thought"}
            </Badge>
            {isVideoMoment ? (
              <Badge variant="subtle">
                <Film className="mr-1 h-3 w-3" />
                Captured media
              </Badge>
            ) : null}
            {moment.placeName ? (
              <Badge variant="subtle">{moment.placeName}</Badge>
            ) : null}
          </div>
          <div>
            <p className="text-base font-medium text-[var(--ink)]">
              {moment.caption ??
                moment.thoughtText?.slice(0, 96) ??
                "Trip moment"}
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>{tripTimeLabel} time: {times.tripLabel}</p>
              {times.viewerLabel ? <p>Your time: {times.viewerLabel}</p> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canManage && onHide && onDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Moment options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onClick={() => onEdit(moment)}>
                    Edit details
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => onHide(moment)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide from viewers
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[#7f1d1d]"
                  onClick={() => onDelete(moment)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete moment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button size="icon" variant="ghost" className="h-10 w-10" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close moment</span>
          </Button>
        </div>
      </div>

      {moment.type === "photo" && moment.imageUrl ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[26px] bg-[var(--paper)]">
            {isVideoMoment ? (
              <video
                className="h-64 w-full bg-black object-cover sm:h-80"
                controls
                playsInline
                preload="metadata"
                src={moment.imageUrl}
              />
            ) : (
              <button
                aria-label="Open full-screen photo"
                className="group relative block w-full overflow-hidden text-left"
                onClick={() => onOpenPhotoViewer(moment)}
                title="Open full-screen photo"
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                  className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.01] sm:h-80"
                  src={moment.imageUrl}
                />
                <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--ink)] shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </button>
            )}
          </div>
          {moment.thoughtText ? (
            <div className="rounded-[24px] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--ink)]">
              {moment.thoughtText}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[26px] bg-[var(--paper)] p-5 text-base leading-7 text-[var(--ink)]">
          {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
        </div>
      )}

      <MomentComments
        authorKind={canManage ? "traveler" : "viewer"}
        moment={moment}
        trip={trip}
      />
    </article>
  );
}

function MomentPhotoViewer({
  moment,
  onClose,
}: {
  moment: Moment | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!moment) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moment, onClose]);

  if (!moment?.imageUrl) {
    return null;
  }

  return (
    <div
      aria-label="Full-screen photo"
      aria-modal="true"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 text-white sm:p-6"
      role="dialog"
    >
      <button
        aria-label="Dismiss full-screen photo"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        type="button"
      />
      <Button
        className="absolute right-3 top-3 z-20 h-11 w-11 bg-white/10 text-white hover:bg-white/20 sm:right-5 sm:top-5"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        size="icon"
        title="Close full-screen photo"
        type="button"
        variant="ghost"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Close full-screen photo</span>
      </Button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={moment.caption ?? moment.placeName ?? "Trip photo"}
        className="relative z-10 max-h-[calc(100dvh-1.5rem)] max-w-full object-contain sm:max-h-[calc(100dvh-3rem)]"
        src={moment.imageUrl}
      />
    </div>
  );
}

export function MomentBottomSheet({
  trip,
  moments,
  selectedMomentId,
  open,
  canManage = false,
  carouselTitle,
  onClose,
  onSelectMoment,
  onEdit,
  onHide,
  onDelete,
}: MomentBottomSheetProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [photoViewerMoment, setPhotoViewerMoment] = useState<Moment | null>(null);
  const selectedIndex = Math.max(
    0,
    moments.findIndex((moment) => moment.id === selectedMomentId),
  );
  const activeMoment = moments[selectedIndex] ?? null;
  const hasMultipleMoments = moments.length > 1;

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || !open || moments.length === 0) {
      return;
    }

    const width = scroller.clientWidth;

    if (!width) {
      return;
    }

    const currentIndex = Math.round(scroller.scrollLeft / width);

    if (currentIndex === selectedIndex) {
      return;
    }

    scroller.scrollTo({
      left: width * selectedIndex,
      behavior: "smooth",
    });
  }, [moments.length, open, selectedIndex]);

  function selectMomentAtIndex(nextIndex: number) {
    const moment = moments[nextIndex];

    if (!moment) {
      return;
    }

    onSelectMoment?.(moment.id);
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 transition duration-300 sm:p-4",
          open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
        )}
      >
        <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
          {activeMoment ? (
            <>
              {hasMultipleMoments ? (
                <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {carouselTitle ?? `${moments.length} moments in this spot`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      className="h-9 w-9"
                      disabled={selectedIndex === 0}
                      onClick={() => selectMomentAtIndex(selectedIndex - 1)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous moment</span>
                    </Button>
                    <span className="min-w-16 text-center text-sm font-medium text-[var(--ink)]">
                      {selectedIndex + 1} / {moments.length}
                    </span>
                    <Button
                      className="h-9 w-9"
                      disabled={selectedIndex === moments.length - 1}
                      onClick={() => selectMomentAtIndex(selectedIndex + 1)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next moment</span>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => {
                  if (!hasMultipleMoments) {
                    return;
                  }

                  const target = event.currentTarget;
                  const width = target.clientWidth;

                  if (!width) {
                    return;
                  }

                  const nextIndex = Math.max(
                    0,
                    Math.min(
                      moments.length - 1,
                      Math.round(target.scrollLeft / width),
                    ),
                  );
                  const nextMoment = moments[nextIndex];

                  if (
                    nextMoment &&
                    nextMoment.id !== selectedMomentId
                  ) {
                    onSelectMoment?.(nextMoment.id);
                  }
                }}
              >
                {moments.map((moment) => (
                  <MomentSheetSlide
                    key={moment.id}
                    canManage={canManage}
                    moment={moment}
                    onClose={onClose}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onHide={onHide}
                    onOpenPhotoViewer={setPhotoViewerMoment}
                    trip={trip}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <MomentPhotoViewer
        moment={photoViewerMoment}
        onClose={() => setPhotoViewerMoment(null)}
      />
    </>
  );
}
