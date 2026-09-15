import { useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ErrorState } from "../../../shared/components/ErrorState";
import { StatusChip } from "../../../shared/components/StatusChip";
import { useNotificationsDashboard } from "../../notifications/hooks/notification.queries";
import type {
  NotificationChannel,
  NotificationModel,
} from "../../notifications/models/notification.model";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<NotificationChannel | "ALL">("ALL");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dashboardQuery = useNotificationsDashboard();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [i18n.language],
  );

  const items = useMemo(() => {
    const recent = dashboardQuery.data?.recent ?? [];

    if (channel === "ALL") {
      return recent;
    }

    return recent.filter((item) => item.channel === channel);
  }, [dashboardQuery.data?.recent, channel]);

  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const summary = dashboardQuery.data?.summary;

  const metrics = [
    {
      label: t("dashboard.total"),
      value: summary?.total ?? 0,
      icon: SendRoundedIcon,
      color: "#6f79ff",
      glow: "rgba(111,121,255,0.22)",
      trend: t("dashboard.totalHint"),
    },
    {
      label: t("dashboard.delivered"),
      value: summary?.delivered ?? 0,
      icon: CheckCircleRoundedIcon,
      color: "#35d07f",
      glow: "rgba(53,208,127,0.18)",
      trend: t("dashboard.deliveredHint"),
    },
    {
      label: t("dashboard.pending"),
      value: summary?.pending ?? 0,
      icon: ScheduleRoundedIcon,
      color: "#f1ae33",
      glow: "rgba(241,174,51,0.18)",
      trend: t("dashboard.pendingHint"),
    },
    {
      label: t("dashboard.failed"),
      value: summary?.failed ?? 0,
      icon: ErrorRoundedIcon,
      color: "#ff5f73",
      glow: "rgba(255,95,115,0.18)",
      trend: t("dashboard.failedHint"),
    },
  ];

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message={t("errors.loadNotifications")}
        onRetry={() => {
          void dashboardQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            sm: "flex-end",
          },
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: "2rem",
                md: "2.55rem",
              },
              fontWeight: 800,
              letterSpacing: "-0.045em",
            }}
          >
            {t("dashboard.title")}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.35 }}>
            {t("dashboard.subtitle")}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate("/notifications/new")}
          sx={{
            minHeight: 44,
            px: 2.5,
            borderRadius: 2.5,
            background: "linear-gradient(135deg, #6f63ff 0%, #7658ff 100%)",
            boxShadow: "0 12px 28px rgba(111,99,255,0.24)",
          }}
        >
          {t("notifications.create")}
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0,1fr))",
            xl: "repeat(4, minmax(0,1fr))",
          },
          gap: 2,
        }}
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card
              key={metric.label}
              sx={{
                minHeight: 150,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <CardContent
                sx={{
                  p: 2.4,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        color: metric.color,
                        bgcolor: metric.glow,
                      }}
                    >
                      <Icon />
                    </Box>

                    <MiniBars color={metric.color} />
                  </Stack>

                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {metric.label}
                    </Typography>

                    {dashboardQuery.isPending ? (
                      <Skeleton width={90} height={44} />
                    ) : (
                      <Typography
                        sx={{
                          mt: 0.15,
                          fontSize: "1.85rem",
                          fontWeight: 800,
                          letterSpacing: "-0.035em",
                        }}
                      >
                        {metric.value.toLocaleString(i18n.language)}
                      </Typography>
                    )}

                    <Typography
                      sx={{
                        mt: 0.5,
                        color: metric.color,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      {metric.trend}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Stack
        direction={{
          xs: "column",
          lg: "row",
        }}
        spacing={2}
        sx={{
          alignItems: {
            lg: "stretch",
          },
        }}
      >
        <Card
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              px: 2.2,
              pt: 1.2,
            }}
          >
            <Tabs
              value={channel}
              onChange={(_event, value: NotificationChannel | "ALL") =>
                setChannel(value)
              }
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{
                minHeight: 44,
              }}
            >
              <Tab value="ALL" label={t("dashboard.all")} />

              <Tab
                value="EMAIL"
                label={t("channels.EMAIL")}
                icon={<EmailOutlinedIcon fontSize="small" />}
                iconPosition="start"
              />

              <Tab
                value="SMS"
                label={t("channels.SMS")}
                icon={<SmsOutlinedIcon fontSize="small" />}
                iconPosition="start"
              />

              <Tab
                value="PUSH"
                label={t("channels.PUSH")}
                icon={<SmartphoneRoundedIcon fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Divider />

          <Box sx={{ p: 2.2 }}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Box>
                <Typography variant="h6">{t("dashboard.recent")}</Typography>

                <Typography variant="body2" color="text.secondary">
                  {t("dashboard.recentSubtitle")}
                </Typography>
              </Box>

              <Button
                size="small"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate("/notifications")}
              >
                {t("dashboard.viewAll")}
              </Button>
            </Stack>

            <Stack spacing={0.7}>
              {dashboardQuery.isPending
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} variant="rounded" height={58} />
                  ))
                : items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      active={selected?.id === item.id}
                      onClick={() => setSelectedId(item.id)}
                      date={dateFormatter.format(item.createdAt)}
                    />
                  ))}

              {!dashboardQuery.isPending && items.length === 0 && (
                <Box
                  sx={{
                    py: 8,
                    textAlign: "center",
                  }}
                >
                  <NotificationsActiveRoundedIcon
                    sx={{
                      fontSize: 42,
                      color: "text.disabled",
                    }}
                  />

                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {t("notifications.noRows")}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Card>

        <Card
          sx={{
            width: {
              xs: "100%",
              lg: 350,
              xl: 390,
            },
            flexShrink: 0,
          }}
        >
          <CardContent sx={{ p: 2.4 }}>
            {selected ? (
              <Stack spacing={2.2}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {selected.title}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        mt: 0.8,
                      }}
                    >
                      <StatusChip status={selected.status} />

                      <Typography variant="caption" color="text.secondary">
                        {dateFormatter.format(selected.createdAt)}
                      </Typography>
                    </Stack>
                  </Box>

                  <IconButton size="small" aria-label="menu">
                    <MoreVertRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t("notifications.recipient")}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      overflowWrap: "anywhere",
                      fontWeight: 650,
                    }}
                  >
                    {selected.recipient}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 2,
                    }}
                  >
                    {t("notifications.content")}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      color: "text.secondary",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                    }}
                  >
                    {selected.content}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    minHeight: 170,
                    borderRadius: 3.5,
                    p: 2.2,
                    overflow: "hidden",
                    position: "relative",
                    color: "#fff",
                    background:
                      "radial-gradient(circle at 90% 20%, rgba(93,108,255,.8), transparent 25%), linear-gradient(135deg, #0d1630 0%, #111f42 55%, #11172a 100%)",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      width: 170,
                      height: 170,
                      borderRadius: "50%",
                      right: -55,
                      bottom: -80,
                      border: "1px solid rgba(122,137,255,0.45)",
                      boxShadow: "0 0 60px rgba(96,112,255,0.3)",
                    },
                  }}
                >
                  <Stack
                    sx={{
                      height: "100%",
                      justifyContent: "space-between",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                      }}
                    >
                      <NotificationsActiveRoundedIcon
                        sx={{
                          color: "#7a86ff",
                        }}
                      />

                      <Typography
                        sx={{
                          fontWeight: 750,
                        }}
                      >
                        {t("common.appName")}
                      </Typography>
                    </Stack>

                    <Box>
                      <Typography
                        sx={{
                          maxWidth: 210,
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          lineHeight: 1.15,
                        }}
                      >
                        {t("dashboard.previewTitle")}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 1,
                          color: "rgba(255,255,255,.68)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {t("dashboard.previewSubtitle")}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(`/notifications/${selected.id}`)}
                  fullWidth
                >
                  {t("dashboard.viewDetails")}
                </Button>
              </Stack>
            ) : (
              <Box
                sx={{
                  py: 8,
                  textAlign: "center",
                }}
              >
                <NotificationsActiveRoundedIcon
                  sx={{
                    fontSize: 42,
                    color: "text.disabled",
                  }}
                />

                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {t("dashboard.selectNotification")}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}

function MiniBars({ color }: { color: string }) {
  const heights = [14, 24, 18, 32, 26];

  return (
    <Stack
      direction="row"
      spacing={0.45}
      sx={{
        alignItems: "flex-end",
        height: 38,
        pt: 0.5,
      }}
    >
      {heights.map((height, index) => (
        <Box
          key={index}
          sx={{
            width: 5,
            height,
            borderRadius: 99,
            bgcolor: color,
            opacity: 0.42 + index * 0.12,
            boxShadow: `0 0 12px ${color}33`,
          }}
        />
      ))}
    </Stack>
  );
}

interface NotificationRowProps {
  item: NotificationModel;
  active: boolean;
  date: string;
  onClick: () => void;
}

function NotificationRow({
  item,
  active,
  date,
  onClick,
}: NotificationRowProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: "100%",
        border: "1px solid",
        borderColor: active ? "primary.main" : "divider",
        bgcolor: active ? "rgba(111,99,255,0.13)" : "transparent",
        color: "inherit",
        borderRadius: 2.5,
        px: 1.6,
        py: 1.2,
        textAlign: "left",
        cursor: "pointer",
        transition: "150ms ease",
        "&:hover": {
          bgcolor: active ? "rgba(111,99,255,0.17)" : "action.hover",
          borderColor: active ? "primary.main" : "rgba(128,145,184,0.28)",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr) auto",
            md: "minmax(180px,1.45fr) 90px 110px minmax(110px,.7fr)",
          },
          gap: 1.3,
          alignItems: "center",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            {item.title}
          </Typography>

          <Typography noWrap variant="caption" color="text.secondary">
            {item.content}
          </Typography>
        </Box>

        <Chip
          label={t(`channels.${item.channel}`)}
          size="small"
          variant="outlined"
          sx={{
            display: {
              xs: "none",
              md: "inline-flex",
            },
            justifySelf: "start",
          }}
        />

        <Box
          sx={{
            display: {
              xs: "block",
              md: "block",
            },
          }}
        >
          <StatusChip status={item.status} />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: {
              xs: "none",
              md: "block",
            },
            justifySelf: "end",
            textAlign: "right",
          }}
        >
          {date}
        </Typography>
      </Box>
    </Box>
  );
}
