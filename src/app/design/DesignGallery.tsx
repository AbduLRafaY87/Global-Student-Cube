"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/components/ui/States";
import {
  ApplicationStatusBadge,
  DeadlineChip,
  OfferStatusBadge,
} from "@/components/ui/Status";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/TextField";
import { ToastProvider, useToasts } from "@/components/ui/Toast";
import { MICROCOPY } from "@/domain/microcopy";
import { BOTTOM_NAV, DASHBOARD_NAV } from "@/domain/navigation";
import {
  Bookmark,
  CheckCircle,
  GraduationCap,
  Info,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import { useMemo, useState } from "react";

function nowMs(): number {
  return Date.parse("2026-09-19T00:00:00Z");
}

function DesignGalleryInner() {
  const { pushToast } = useToasts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState("universities");
  const [page, setPage] = useState(1);
  const stamp = useMemo(() => nowMs(), []);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-10 py-8">
      <header>
        <p className="text-sm font-medium text-text-muted">Development only</p>
        <h1 className="mt-1 text-2xl leading-8 font-semibold text-text min-[900px]:text-[32px] min-[900px]:leading-10">
          Design system
        </h1>
        <p className="mt-2 text-base text-text-muted">
          Every shared control in idle, hover, focus, disabled, loading, empty,
          error and semantic states. Light theme only.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Application shell</h2>
        <p className="text-sm text-text-muted">
          Phone chrome uses a 56-unit header, 16-unit gutters and a 64-unit
          bottom bar. More opens the grouped drawer.
        </p>
        <div className="relative h-[420px] overflow-hidden rounded-[var(--radius-card)] border border-border bg-background">
          {mobileOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-[var(--gsc-backdrop)]"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            />
          ) : null}
          <Sidebar
            sections={DASHBOARD_NAV.student}
            collapsed={false}
            mobileOpen={mobileOpen}
            onToggleCollapsed={() => undefined}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className="flex h-full flex-col">
            <Header
              user={{
                email: "student@example.invalid",
                first_name: "Ada",
                last_name: "Example",
                role: "student",
              }}
              unreadCount={3}
              onOpenMobile={() => setMobileOpen(true)}
            />
            <div className="flex-1 px-4 py-4 text-sm text-text-muted">
              Content canvas
            </div>
            <BottomNav
              items={BOTTOM_NAV.student}
              onOpenMore={() => setMobileOpen(true)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Buttons</h2>
        <div className="flex flex-col gap-3">
          <Button>Save profile</Button>
          <Button variant="secondary">Cancel draft</Button>
          <Button variant="destructive">Remove application</Button>
          <Button loading>Save profile</Button>
          <Button disabled>Save profile</Button>
          <IconButton label="Open navigation">
            <Menu className="size-6" aria-hidden />
          </IconButton>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Inputs</h2>
        <p className="text-sm text-text-muted">
          Required fields use a visible * explained here. Optional values are
          labeled Optional.
        </p>
        <TextField id="major" label="Target major" required defaultValue="Law" />
        <TextField
          id="country"
          label="Target country"
          optional
          hint="Full country name."
        />
        <TextField
          id="gpa"
          label="GPA"
          error="Enter a valid GPA."
          defaultValue="x"
        />
        <SelectField
          id="status"
          label="Application status"
          placeholder="Select a status"
          options={[
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Dialog and toast</h2>
        <Button onClick={() => setDialogOpen(true)}>Open confirmation</Button>
        <Button
          variant="secondary"
          onClick={() =>
            pushToast({ tone: "info", text: "Link copied" })
          }
        >
          Show informational toast
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            pushToast({ tone: "error", text: MICROCOPY.saveFailed })
          }
        >
          Show error toast
        </Button>
        <Dialog
          open={dialogOpen}
          title="Remove saved program"
          onClose={() => setDialogOpen(false)}
        >
          <p className="text-sm text-text">
            This removes Synthetic Test University from your shortlist.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => setDialogOpen(false)}>Keep program</Button>
            <Button
              variant="destructive"
              onClick={() => setDialogOpen(false)}
            >
              Remove program
            </Button>
          </div>
        </Dialog>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Card, tabs, table</h2>
        <Card
          title="Synthetic Test University"
          meta="Nairobi · undergraduate"
          action={
            <IconButton label="Save program">
              <Bookmark className="size-6" aria-hidden />
            </IconButton>
          }
          footer={<Button>View university</Button>}
        >
          <p className="text-sm text-text-muted">Not available</p>
        </Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "universities", label: "Universities" },
            { id: "scholarships", label: "Scholarships" },
          ]}
        />
        <Table
          caption="Sample applications"
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "University", cell: (row) => row.name },
            {
              key: "fee",
              header: "Fee",
              align: "right",
              cell: (row) => row.fee,
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => <ApplicationStatusBadge status={row.status} />,
            },
          ]}
          rows={[
            { id: "1", name: "Synthetic A", fee: "USD 10,000 / year", status: "draft" },
            { id: "2", name: "Synthetic B", fee: "USD 12,000 / year", status: "submitted" },
          ]}
          empty="No applications yet."
        />
        <Pagination page={page} hasMore={page < 2} onPageChange={setPage} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Screen states</h2>
        <LoadingState />
        <EmptyState />
        <EmptyState filtered onResetFilters={() => undefined} />
        <ErrorState onRetry={() => undefined} />
        <ForbiddenState />
        <p className="text-sm text-warning">{MICROCOPY.staleSource}</p>
        <p className="text-sm text-text-muted">{MICROCOPY.offline}</p>
        <p className="text-sm text-text-muted">{MICROCOPY.expiredSession}</p>
        <p className="text-sm text-text-muted">{MICROCOPY.conflict}</p>
        <p className="text-sm text-text-muted">{MICROCOPY.lockedFeature}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">
          Semantic: deadlines, applications, offers
        </h2>
        <div className="flex flex-wrap gap-2">
          <DeadlineChip deadline="2026-09-18" nowMs={stamp} />
          <DeadlineChip deadline="2026-09-21" nowMs={stamp} />
          <DeadlineChip deadline="2026-09-30" nowMs={stamp} />
          <DeadlineChip deadline="2027-01-15" nowMs={stamp} />
          <DeadlineChip deadline={null} nowMs={stamp} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ApplicationStatusBadge status="draft" />
          <ApplicationStatusBadge status="submitted" />
          <ApplicationStatusBadge status="accepted" />
          <ApplicationStatusBadge status="rejected" />
        </div>
        <div className="flex flex-wrap gap-2">
          <OfferStatusBadge status="pending" />
          <OfferStatusBadge status="accepted" />
          <OfferStatusBadge status="declined" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Progress (capped bar)</h2>
        <ProgressBar label="Financial readiness" value={72} />
        <ProgressBar label="Financial readiness over 100" value={120} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl leading-7 font-semibold">Icon placement</h2>
        <ul className="space-y-2 text-sm text-text">
          <li className="flex h-12 items-center gap-2">
            <Menu className="size-6" aria-hidden />
            Open navigation
          </li>
          <li className="flex h-12 items-center gap-2">
            <Search className="size-5" aria-hidden />
            Search
          </li>
          <li className="flex h-11 items-center gap-2">
            <Info className="size-5" aria-hidden />
            About field
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="size-4" aria-hidden />
            Verified
          </li>
          <li className="flex h-12 items-center gap-2">
            <GraduationCap className="size-6" aria-hidden />
            Universities
          </li>
          <li className="flex h-12 items-center gap-2">
            <Settings className="size-6" aria-hidden />
            Settings
          </li>
        </ul>
      </section>
    </div>
  );
}

export function DesignGallery() {
  return (
    <ToastProvider>
      <DesignGalleryInner />
    </ToastProvider>
  );
}
