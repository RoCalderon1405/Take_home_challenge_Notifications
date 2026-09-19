import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import GoogleIcon from "@mui/icons-material/Google";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAppDispatch, useAppSelector } from "../../../app/store";
import { setAuthenticatedUser } from "../../../app/store/auth.slice";
import { env } from "../../../config/env";
import { ApiError } from "../../../core/api";
import { tokenStorage } from "../../../core/auth/token-storage";
import { AppButton } from "../../../shared/components/AppButton";
import { authApi } from "../api/auth.api";
import { userMapper } from "../mappers/user.mapper";

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [apiError, setApiError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("auth.invalidEmail")),
        password: z.string().min(1, t("auth.passwordRequired")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    try {
      const response = await authApi.login(values);
      tokenStorage.set(response.accessToken);
      dispatch(setAuthenticatedUser(userMapper.toModel(response.user)));
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setApiError(error instanceof ApiError ? error.message : t("errors.auth"));
    }
  });

  const handleGoogleLogin = () => {
    window.location.assign(`${env.apiUrl}/auth/google`);
  };

  const googleNeedsCookieFlow =
    env.googleOAuthEnabled && env.authTransport === "bearer";


  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 520,
        borderRadius: 5,
        border: "1px solid rgba(46, 111, 214, 0.12)",
        boxShadow: "0 28px 80px rgba(54, 105, 166, 0.18)",
        bgcolor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(18px)",
      }}
    >
      <CardContent sx={{ p: { xs: 3.5, sm: 5 } }}>
        <Stack spacing={3.25}>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              component="h1"
              sx={{
                color: "#0b1f44",
                fontSize: { xs: "1.9rem", sm: "2.15rem" },
                fontWeight: 800,
                letterSpacing: "-0.035em",
              }}
            >
              {t("auth.welcomeBack")}
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#6f7f9f" }}>
              {t("auth.subtitle")}
            </Typography>
          </Box>

          {apiError && (
            <Box
              role="alert"
              sx={{
                borderRadius: 2.5,
                px: 2,
                py: 1.25,
                bgcolor: "#fff1f2",
                color: "#b42318",
                border: "1px solid #fecdd3",
                fontSize: "0.9rem",
              }}
            >
              {apiError}
            </Box>
          )}

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.4}>
              <TextField
                label={t("auth.email")}
                type="email"
                autoComplete="email"
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon
                          sx={{ color: "#6f7f9f", fontSize: 20 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={loginFieldSx}
                {...register("email")}
              />
              <TextField
                label={t("auth.password")}
                type="password"
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon
                          sx={{ color: "#6f7f9f", fontSize: 20 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={loginFieldSx}
                {...register("password")}
              />
              <AppButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                fullWidth
                sx={{
                  minHeight: 52,
                  borderRadius: 2.5,
                  background:
                    "linear-gradient(135deg, #2c72f6 0%, #2a87ff 100%)",
                  fontSize: "1rem",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #205fd7 0%, #1976ed 100%)",
                  },
                }}
              >
                {t("auth.signIn")}
              </AppButton>
            </Stack>
          </Box>

          {env.googleOAuthEnabled && (
            <>
              <Divider
                sx={{
                  color: "#91a0ba",
                  "&::before, &::after": {
                    borderColor: "rgba(111,127,159,0.2)",
                  },
                }}
              >
                {t("auth.divider")}
              </Divider>{" "}
              <AppButton
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={googleNeedsCookieFlow}
                fullWidth
                sx={{
                  minHeight: 50,
                  borderRadius: 2.5,
                  borderColor: "rgba(111,127,159,0.28)",
                  color: "#172b4d",
                  bgcolor: "#fff",
                  "&:hover": {
                    borderColor: "#2c72f6",
                    bgcolor: "#f8fbff",
                  },
                }}
              >
                {t("auth.continueGoogle")}
              </AppButton>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

const loginFieldSx = {
  "& .MuiInputLabel-root": {
    color: "#52617d",
  },
  "& .MuiOutlinedInput-root": {
    minHeight: 54,
    borderRadius: 2.5,
    color: "#0b1f44",
    bgcolor: "rgba(250,252,255,0.92)",
    "& fieldset": {
      borderColor: "rgba(111,127,159,0.25)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(44,114,246,0.48)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#2c72f6",
    },
  },
} as const;
