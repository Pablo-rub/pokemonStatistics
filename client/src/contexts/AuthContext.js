import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { getAuthErrorMessage } from '../utils/errorMessages';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const createUserRecord = async (user) => {
    try {
      // First create the user entry in saved_replays table
      await axios.post('http://localhost:5000/api/users/saved-replays', {
        userId: user.uid,
      });
    } catch (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user already exists in database
      try {
        const response = await axios.get(`http://localhost:5000/api/users/${result.user.uid}/saved-replays`);
        if (!response.data || response.data.length === 0) {
          await createUserRecord(result.user);
        }
      } catch (error) {
        // If user doesn't exist, create record
        if (error.response && error.response.status === 404) {
          await createUserRecord(result.user);
        }
      }
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      if (password.length < 6) {
        // eslint-disable-next-line no-throw-literal
        throw { code: 'auth/weak-password' };
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await createUserRecord(result.user);
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setAuthError(null);
      return result;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      throw error;
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        oldPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (password = null) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      if (currentUser.providerData[0].providerId === 'password' && password) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          password
        );
        await reauthenticateWithCredential(currentUser, credential);
      }
      // First delete saved replays
      await axios.delete(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays`);
      // Then delete Firebase user
      await deleteUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    authError,
    changePassword,
    deleteAccount,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}