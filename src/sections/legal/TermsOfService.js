import { Container, styled } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Logo from '../../components/logo/Logo';

const StyledRoot = styled('div')(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
}));

const StyledContent = styled('div')(({ theme }) => ({
  margin: 'auto',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'column',
  padding: theme.spacing(12, 0),
}));

const markdownContent = `
# Terms of Service

These terms of service ("terms") govern your access to and use of the https://memesrc.com website (the "service") operated by Vibe House LLC ("us", "we", "our"). Please read these terms carefully.

## Acceptance of Terms

By accessing or using our service, you agree to be bound by these terms and all terms incorporated by reference. If you do not agree to these terms, do not access or use our service.

## Age Limitation

Our services are not available to users who are under the age of 13. If you are under the age of 13, you are not permitted to access or use our services under any circumstances. By accessing or using our services, you represent and affirm that you are at least 13 years old and that you have the legal ability to enter into this agreement.

Users between the ages of 13 and 17 may use our services only with the involvement and consent of a parent or legal guardian, under whose account the minor's use must be registered. The parent or legal guardian must read and accept these terms of service in full. By authorizing a minor's access to our services, the parent or legal guardian agrees to these terms on behalf of the minor.

Parents and guardians are responsible for monitoring and supervising the minor's usage. If you have authorized a minor to use our service, you are responsible for the online conduct of the minor, the control of the minor’s access to and use of the service, and the consequences of any misuse.
If you do not qualify under these terms, do not use our service. Use of our service is void where prohibited by law.

## Privacy Policy

Please refer to our Privacy Policy for information about how we collect, use, and disclose information about you.

## Copyright Infringement and User Responsibility

memeSRC, provided by Vibe House LLC, is a platform designed for artists, journalists, and others to research, critique, create, and comment on memes, their sources, and related trend data. Our service, including its proprietary features and functionalities, such as our logo, design, graphics, and software, is the exclusive property of Vibe House LLC and is protected by all applicable copyright and trademark laws.

While we hold all rights to our proprietary content, we do not claim ownership over any of the content submitted by users or any of the indexed content derived from third parties. Our platform is designed to enable lawful expression, such as criticism, comment, news reporting, teaching, scholarship, or research, within the bounds of the "17 U.S. Code § 107 - Limitations on exclusive rights: Fair use”. Usage of this platform which infringes on the copyrights of others is expressly forbidden and is a violation of our terms of service. 

It is the responsibility of each individual user to ensure that their use of our service does not infringe upon the rights of others. While we aim to provide a platform that encourages legal use, we cannot guarantee that every action by users is in accordance with copyright law. As a user, it is your duty to respect the intellectual property rights of others when using our service.

If you believe that your copyrighted work has been used on our site in a way that infringes upon your rights, please provide us with the following information:

- A physical or electronic signature of the person authorized to act on behalf of the copyright owner.
- A detailed description of the copyrighted work that you claim has been infringed.
- A specific description of where on our site the material that you claim is infringing is located.
- Your contact information, including your address, telephone number, and email address.
- A statement declaring that you have a good faith belief that the use of the content in the manner complained of is not authorized by the copyright owner, its agent, or the law.
- A statement made under penalty of perjury, that the information in your notice is accurate, and that you are the copyright owner or are authorized to act on the copyright owner's behalf.

You may submit this information to us via email at contact@vibehouse.net or by mail to: 720 Montague Ave #101, Greenwood, SC 29649. United States of America.

We take copyright infringement very seriously and will review all submitted reports carefully. False or misleading claims may have legal repercussions, so we kindly advise you to be certain of your claims before submitting them. This process is in place to ensure that copyright owners' rights are respected while also preserving the integrity and freedom of our users and our service.

## User-Generated Content

By uploading, creating, sharing, or otherwise distributing your content on or through our service, you grant us a non-exclusive, transferable, royalty-free, perpetual, irrevocable, worldwide license to use, copy, modify, distribute, publicly display and perform, and create derivative works of your content for any purpose related to our service.

You are solely responsible for all content that you post. You represent that you own, or have the necessary rights to, all content that you post. Furthermore, you represent that the use and posting of your content does not violate, misappropriate or infringe on the rights of any third party, including, without limitation, privacy rights, copyrights, trademark and/or other intellectual property rights.

We do not endorse, support, represent or guarantee the completeness, truthfulness, accuracy, or reliability of any user-generated content or communications posted via our services. You understand that by using the services, you may be exposed to content that might be offensive, harmful, inaccurate or otherwise inappropriate.

## Subscription Services

We offer subscription services that give you access to advanced tools and analytics. The length, renewal, and cancellation terms of these subscriptions will be provided to you at the time of purchase. There are no refunds for the subscription services.

## Communications

By using our service, you agree to receive certain electronic communications from us. You agree that any notices, agreements, disclosures, or other communications that we send to you electronically will satisfy any legal communication requirements, including that those communications be in writing.

## Account Suspension or Termination

We reserve the right to suspend or terminate your account and prevent access to the service for any reason, at our discretion.

## Governing Law

These terms, and any dispute or claim arising out of or in connection with them, their subject matter or formation, shall be governed by, and construed in accordance with, the laws of the United States of America, without regard to its conflict of law principles. This applies regardless of where in the world you reside or access or use our service.

The choice of law rule of any jurisdiction, as well as the United Nations Convention on Contracts for the International Sale of Goods, will not apply to any disputes under these terms.

Notwithstanding the above, if you are a resident outside of the United States of America, the mandatory consumer protection provisions that apply in your country of residence may also apply to some aspects of your use of our service.

If any disputes arise between you and us under these terms, or in relation to our service, and you do not reside in the United States of America, you must first attempt to resolve the dispute informally with us before initiating any formal dispute resolution process.

If you are a resident of the United States of America, any legal suit, action or proceeding arising out of, or related to, these terms of service or the service shall be instituted exclusively in the federal courts of the United States or the courts of the State of South Carolina in each case located in the City of Greenwood and County of Greenwood. You waive any and all objections to the exercise of jurisdiction over you by such courts and to venue in such courts.

Please note that this clause does not prevent us from seeking injunctive relief in any jurisdiction when necessary to protect our urgent interests.

## Dispute Resolution

If a dispute arises between you and us, we strongly encourage you to first contact us directly to seek a resolution. If you are not satisfied with this resolution, you agree that the dispute will be resolved through an independent and confidential arbitration process, unless you opt-out within 15 days of the dispute arising.

## Limitation of Liability

To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.

## Changes to Terms

We may modify these terms at any time. If we do so, we will notify you by publishing the changes on our website. Continued use of the service after the changes have been posted constitutes acceptance of the changes.

## Service Availability

While we strive to keep our service available at all times, there will be occasions when our service may be interrupted, including for scheduled maintenance or upgrades, for emergency repairs, or due to the failure of telecommunications links and equipment that are beyond our control.

## Site Access

We grant you a limited, non-exclusive, non-transferable, and revocable license to use our services. You are not permitted to reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website, except as necessary to use the service for its intended purpose.
`;

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title> Terms of Service • memeSRC </title>
      </Helmet>

      <StyledRoot>
        <Link to="/">
          <Logo
            sx={{
              position: 'fixed',
              top: { xs: 16, sm: 24, md: 40 },
              left: { xs: 16, sm: 24, md: 40 },
            }}
          />
        </Link>

        <Container maxWidth="md">
          <StyledContent>
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  );
}
