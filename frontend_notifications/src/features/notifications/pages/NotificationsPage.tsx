import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Card,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
} from '@mui/material';
import Alert from '@mui/material/Alert';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { PageLayout } from '../../../layouts/PageLayout/PageLayout';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorState } from '../../../shared/components/ErrorState';
import { AppButton } from '../../../shared/components/AppButton';
import { StatusChip } from '../../../shared/components/StatusChip';
import { NotificationFilters } from '../components/NotificationFilters';
import { NotificationSummary } from '../components/NotificationSummary';
import {
  useDeleteNotification,
  useNotifications,
} from '../hooks/notification.queries';
import type {
  NotificationChannel,
  NotificationModel,
  NotificationStatus,
} from '../models/notification.model';

const sortableFields = new Set([
  'createdAt',
  'updatedAt',
  'title',
  'status',
  'channel',
  'recipient',
]);

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'createdAt', sort: 'desc' }]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [channel, setChannel] = useState<NotificationChannel | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<NotificationModel | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const primarySort = sortModel[0];
  const sortBy = primarySort && sortableFields.has(primarySort.field)
    ? (primarySort.field as 'createdAt' | 'updatedAt' | 'title' | 'status' | 'channel' | 'recipient')
    : 'createdAt';
  const sortDirection = primarySort?.sort === 'asc' ? 'asc' : 'desc';

  const query = useNotifications({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    sortBy,
    sortDirection,
    status: status || undefined,
    channel: channel || undefined,
    search: search || undefined,
  });

  const deleteMutation = useDeleteNotification();

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  const columns = useMemo<GridColDef<NotificationModel>[]>(
    () => [
      { field: 'title', headerName: t('notifications.titleField'), flex: 1.4, minWidth: 190 },
      {
        field: 'channel',
        headerName: t('notifications.channel'),
        width: 120,
        renderCell: (params) => {
          switch (params.row.channel) {
            case 'EMAIL':
              return t('channels.EMAIL');
            case 'SMS':
              return t('channels.SMS');
            case 'PUSH':
              return t('channels.PUSH');
          }
        },
      },
      { field: 'recipient', headerName: t('notifications.recipient'), flex: 1.2, minWidth: 190 },
      {
        field: 'status',
        headerName: t('notifications.status'),
        width: 145,
        renderCell: (params) => <StatusChip status={params.row.status} />,
      },
      {
        field: 'createdAt',
        headerName: t('notifications.createdAt'),
        width: 190,
        renderCell: (params) => dateFormatter.format(params.row.createdAt),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        sortable: false,
        filterable: false,
        width: 140,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title={t('notifications.view')}>
              <IconButton size="small" onClick={() => navigate(`/notifications/${params.row.id}`)} aria-label={t('notifications.view')}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.edit')}>
              <IconButton size="small" onClick={() => navigate(`/notifications/${params.row.id}/edit`)} aria-label={t('common.edit')}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(params.row)} aria-label={t('common.delete')}>
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [dateFormatter, navigate, t],
  );

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setChannel('');
    setPaginationModel((current) => ({ ...current, page: 0 }));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setFeedback(t('notifications.deletedSuccess'));
  };

  return (
    <PageLayout
      title={t('notifications.title')}
      description={t('notifications.subtitle')}
      actions={
        <AppButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/notifications/new')}
        >
          {t('notifications.create')}
        </AppButton>
      }
    >
      <NotificationSummary items={query.data?.items ?? []} total={query.data?.pagination.totalItems ?? 0} />

      <NotificationFilters
        search={searchInput}
        status={status}
        channel={channel}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => {
          setStatus(value);
          setPaginationModel((current) => ({ ...current, page: 0 }));
        }}
        onChannelChange={(value) => {
          setChannel(value);
          setPaginationModel((current) => ({ ...current, page: 0 }));
        }}
        onClear={clearFilters}
      />

      {query.isError ? (
        <ErrorState message={t('errors.loadNotifications')} onRetry={() => void query.refetch()} />
      ) : (
        <Card sx={{ overflow: 'hidden', borderRadius: 3.5 }}>
          <DataGrid
            autoHeight
            rows={query.data?.items ?? []}
            columns={columns}
            loading={query.isFetching}
            rowCount={query.data?.pagination.totalItems ?? 0}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              setSortModel(model);
              setPaginationModel((current) => ({ ...current, page: 0 }));
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: t('notifications.noRows') }}
            sx={{
              border: 0,
              minHeight: 520,
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', borderBottomColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
              '& .MuiDataGrid-cell': { borderBottomColor: 'divider' },
            }}
          />
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('notifications.deleteTitle')}
        message={t('notifications.deleteMessage')}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      <Snackbar open={Boolean(feedback)} autoHideDuration={3500} onClose={() => setFeedback(null)}>
        <Alert severity="success" variant="filled" onClose={() => setFeedback(null)}>{feedback}</Alert>
      </Snackbar>
    </PageLayout>
  );
}
