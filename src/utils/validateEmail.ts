export default function validateEmail(email: string): boolean {
  // Regular expression pattern for email validation
  const emailPattern = /^[^\s@]+(?:\+[^\s@]+)?@[^\s@]+\.[^\s@]+$/;

  // Test the email against the pattern
  return emailPattern.test(email);
}

