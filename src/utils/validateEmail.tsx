export default function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+(?:\+[^\s@]+)?@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}
