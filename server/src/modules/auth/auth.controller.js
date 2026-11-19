
const authService = require("./auth.service");

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge:
    Number(process.env.REFRESH_TOKEN_DAYS || 7) *
    24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, cookieOptions);
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
  });
};

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(
      req.validatedBody
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    const result = await authService.loginUser(
      email,
      password
    );

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

const refresh = async (req, res) => {
  try {
    const oldToken = req.cookies?.refreshToken;

    if (!oldToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const result = await authService.refreshSession(
      oldToken
    );

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh session",
    });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logoutSession(refreshToken);
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
