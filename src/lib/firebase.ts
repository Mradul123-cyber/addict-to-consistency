import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBU16-Vx-85DbzjaF73hmOoucwlOM1O74I",
  authDomain: "matrix-jee-workstation.firebaseapp.com",
  projectId: "matrix-jee-workstation",
  storageBucket: "matrix-jee-workstation.firebasestorage.app",
  messagingSenderId: "909111436316",
  appId: "1:909111436316:web:c485caa05e82a410e3ebd9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const isClient = typeof window !== "undefined";
export const db = (() => {
  if (!isClient) return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
})();
export const storage = getStorage(app);
export default app;
