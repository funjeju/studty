import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type UserRole = "student" | "teacher" | "parent";

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  grade?: number;       // 학생: 학년 / 교사: 담임 학년
  classNum?: number;    // 교사: 담임 반
  school?: string;
  subject?: string;     // 중등 교사 과목 (초등은 미사용)
  linkedStudentId?: string; // 학부모 → 학생 연동
}

export async function signUp(
  email: string,
  password: string,
  role: UserRole,
  extra: { name: string; grade?: number; classNum?: number; school?: string; subject?: string; linkedStudentId?: string }
): Promise<AppUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const userData: AppUser = {
    uid,
    email,
    role,
    name: extra.name,
    ...(extra.grade !== undefined && { grade: extra.grade }),
    ...(extra.classNum !== undefined && { classNum: extra.classNum }),
    ...(extra.school !== undefined && { school: extra.school }),
    ...(extra.subject !== undefined && { subject: extra.subject }),
    ...(extra.linkedStudentId !== undefined && { linkedStudentId: extra.linkedStudentId }),
  };

  await setDoc(doc(db, "users", uid), userData);

  // 역할별 컬렉션에도 저장 (백엔드 조회용)
  if (role === "student") {
    await setDoc(doc(db, "students", uid), {
      student_id: uid,
      name: extra.name,
      grade: extra.grade || 3,
      classNum: extra.classNum || 0,
      school: extra.school || "",
    });
  } else if (role === "teacher") {
    await setDoc(doc(db, "teachers", uid), {
      teacher_id: uid,
      name: extra.name,
      school: extra.school || "",
      grade: extra.grade || 3,
      classNum: extra.classNum || 1,
      subject: extra.subject || "",
    });
  } else if (role === "parent") {
    await setDoc(doc(db, "parents", uid), {
      parent_id: uid,
      name: extra.name,
      linked_student_id: extra.linkedStudentId || "",
    });
  }

  return userData;
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("사용자 정보를 찾을 수 없습니다.");
  return snap.data() as AppUser;
}

export async function linkStudentToParent(parentUid: string, studentId: string): Promise<void> {
  // 학생 존재 확인
  const studentSnap = await getDoc(doc(db, "students", studentId));
  if (!studentSnap.exists()) throw new Error("학생 ID를 찾을 수 없습니다.");

  await setDoc(doc(db, "parents", parentUid), { linked_student_id: studentId }, { merge: true });
  await setDoc(doc(db, "users", parentUid), { linkedStudentId: studentId }, { merge: true });
}

export async function getCurrentUser(user: User): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export const logout = () => signOut(auth);

export { onAuthStateChanged, auth };
