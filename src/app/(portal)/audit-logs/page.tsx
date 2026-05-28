'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { endpoints } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

export default function AuditLogsPage() {
  const [adminUserId, setAdminUserId] = useState('');
  const [action, setAction] = useState('');
  const [subjectType, setSubjectType] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const perPage = 50;

  const q = useQuery({
    queryKey: ['audit', { adminUserId, action, subjectType, since, until, page }],
    queryFn: () =>
      endpoints.auditLogs({
        admin_user_id: adminUserId || undefined,
        action: action || undefined,
        subject_type: subjectType || undefined,
        since: since || undefined,
        until: until || undefined,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only feed of every state-changing admin action."
      />

      <Card className="mb-4">
        <form
          className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
        >
          <Input
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            placeholder="Admin id"
          />
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action (tokens. for prefix)"
          />
          <Input
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value)}
            placeholder="Subject type"
          />
          <Input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} />
          <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          <Button type="submit" variant="secondary">
            <Filter className="h-4 w-4" /> Apply
          </Button>
        </form>
      </Card>

      {q.isLoading && !q.data ? (
        <Card>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10" />
          ))}
        </Card>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Admin</TH>
                <TH>Action</TH>
                <TH>Subject</TH>
                <TH>IP</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((r) => (
                // Fragment needs an explicit key so React doesn't warn about
                // missing keys on the two <TR> children below.
                <Fragment key={r.id}>
                  <TR>
                    <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(r.createdAt)}</TD>
                    <TD>
                      <p className="font-medium">{r.admin?.name ?? '—'}</p>
                      <p className="text-[11px] text-[var(--color-brand-muted)]">{r.admin?.email}</p>
                    </TD>
                    <TD>
                      <Badge tone="primary" className="font-mono text-[11px]">
                        {r.action}
                      </Badge>
                    </TD>
                    <TD>
                      {r.subjectType && (
                        <span className="text-xs">
                          <code className="text-[var(--color-brand-muted)]">{r.subjectType}</code>{' '}
                          {r.subjectId && (
                            <code className="font-mono text-[var(--color-brand-fg)]">
                              {String(r.subjectId).slice(0, 12)}…
                            </code>
                          )}
                        </span>
                      )}
                    </TD>
                    <TD className="font-mono text-xs">{r.requestIp ?? '—'}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition ${openId === r.id ? 'rotate-180' : ''}`}
                        />
                      </Button>
                    </TD>
                  </TR>
                  {openId === r.id && (
                    <TR>
                      <TD colSpan={6} className="bg-[var(--color-brand-bg)]">
                        <pre className="overflow-auto rounded-md bg-white p-3 text-xs">
                          {JSON.stringify(r.payload ?? {}, null, 2)}
                        </pre>
                      </TD>
                    </TR>
                  )}
                </Fragment>
              ))}
            </TBody>
          </Table>

          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
