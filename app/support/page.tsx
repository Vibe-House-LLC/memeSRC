import SupportPageContent from '../components/SupportPageContent';

export default function SupportPage() {
  const userIsPro = false; // Set to false to see the centered "Upgrade to Pro" tile

  return <SupportPageContent isPro={userIsPro} />;
}