// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  login as loginService,
  signup as signupService,
  getProfile as getUserProfileService,
  logout as logoutService,
} from "../services/AuthService";
import { testUser } from "../mockData";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const useMock = process.env.REACT_APP_MOCK === "true";

  const fetchUserProfile = useCallback(async () => {
    try {
      if (useMock) {
        setUser(testUser);
      } else {
        const data = await getUserProfileService();
        setUser(data.user || null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [useMock]);

  const loginUser = useCallback(
    async (identifier, password) => {
      try {
        if (useMock) {
          setUser(testUser);
        } else {
          await loginService(identifier, password);
          await fetchUserProfile();
        }
      } catch (error) {
        throw error;
      }
    },
    [useMock, fetchUserProfile]
  );

  const signupUser = useCallback(
    async (username, email, password) => {
      try {
        if (useMock) {
          setUser(testUser);
        } else {
          await signupService(username, email, password);
          await fetchUserProfile();
        }
      } catch (error) {
        throw error;
      }
    },
    [useMock, fetchUserProfile]
  );

  const logoutUser = useCallback(async () => {
    try {
      if (useMock) {
        setUser(null);
      } else {
        await logoutService();
        setUser(null);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [useMock]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Memoize the context value to avoid unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loginUser,
    signupUser,
    logoutUser,
    loading,
  }), [user, loginUser, signupUser, logoutUser, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
