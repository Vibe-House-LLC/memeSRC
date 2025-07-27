
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

Welcome to memeSRC.com! These terms of service ("Terms") govern your access to and use of the memeSRC.com website (the "Service"), which is operated by Vibe House LLC ("us", "we", or "our"). Please review these Terms thoroughly before using our Service.

## Acceptance of Terms

By accessing or using the Service, you confirm that you accept these Terms and agree to comply with them. If you do not agree to these Terms, you must not use our Service.

## Age Restrictions

The Service is intended for users who are at least 13 years old. Users under 13 are not allowed to use the Service. If you are between 13 and 17, you may use the Service only with the involvement and approval of a parent or guardian.

## Privacy

Your privacy is important to us. Our Privacy Policy explains how we handle your personal data. Please review it to understand our practices.

## User Conduct Guidelines

memeSRC is committed to maintaining a safe and inclusive platform for all users. We require that all users engage with the service in a respectful and lawful manner. The following guidelines outline prohibited conduct on our platform. Engaging in these activities may result in the suspension or termination of your account.

### Prohibited Conduct
You may not engage in any of the following activities on our platform:
- **Illegal Activities**: Engaging in illegal activities or promoting illegal acts.
- **Hate Speech and Discrimination**: Posting or promoting content that includes hate speech, threats of violence, or discrimination based on race, ethnicity, national origin, sex, gender, sexual orientation, religious affiliation, disabilities, or diseases.
- **Harassment and Bullying**: Harassing, intimidating, or bullying other users. This includes unsolicited or aggressive behavior intended to disturb or upset individuals or groups of individuals.
- **Spam and Malware**: Distributing spam or other unsolicited messages, or software viruses or any other types of malicious code that will affect the operation of the service or other users’ equipment.
- **Intellectual Property Infringement**: Posting content that infringes upon the intellectual property rights of others.
- **Pornography and Obscenity**: Uploading or distributing pornographic or excessively violent material.
- **False Information**: Knowingly disseminating false or misleading information.

### Enforcement
We reserve the right to enforce these guidelines at our discretion. Enforcement actions may include, but are not limited to, removing offending content, suspending or terminating access to the service, and cooperating with law enforcement authorities in cases involving potential harm or threats to the safety of any person.

### Reporting Violations
If you encounter any content or behavior that violates these guidelines, please report it to us immediately using the contact or reporting tools provided on the platform. Your reports play an essential role in keeping our community safe and respectful.

By using memeSRC, you agree to comply with these User Conduct Guidelines. We appreciate your cooperation in fostering a positive and safe environment for all users.

## User Content and Responsibilities

As a platform tailored for creative expression related to memes, memeSRC allows you to upload, create, and share content. You are responsible for ensuring that your content complies with all applicable laws and does not infringe on the rights of others. By posting content on our Service, you grant us a non-exclusive, royalty-free license to use, reproduce, and distribute your content.

## Fair Use Disclaimer

memeSRC is committed to supporting the rights of content creators and copyright holders, as well as promoting lawful and creative expression. Our service enables users to engage in activities such as artistic expression, criticism, commentary, news reporting, teaching, scholarship, or research—uses that may be protected under the "fair use" doctrine as defined in Section 107 of the U.S. Copyright Act.

We encourage users to consider the following factors when considering "fair use":
- The purpose and character of the use, including whether such use is of a commercial nature or is for nonprofit educational purposes.
- The nature of the copyrighted work.
- The amount and substantiality of the portion used in comparison to the copyrighted work as a whole.
- The effect of the use upon the potential market for, or value of, the copyrighted work.

Please note, claiming fair use is not a guarantee against claims of copyright infringement. Each case of fair use is evaluated on an individual basis, considering the specific facts and circumstances. Users should exercise caution and consult legal advice when in doubt about the legitimacy of their use under the doctrine of fair use.

If you believe that any content on our service violates your copyright and does not fall under fair use, you may submit a DMCA notice as outlined in our Copyright Compliance and DMCA Policy section. Similarly, if your content has been flagged or removed and you believe that such use constitutes fair use, you may respond with a counter-notification in accordance with our DMCA procedures.

## Copyright Compliance and DMCA Policy

We respect intellectual property rights and expect you to do the same. If you believe that your work has been used in a way that constitutes copyright infringement, please follow our DMCA process to report it:

1. **Notification**: Submit a written notice of infringement including:
   - A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
   - Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works at a single online site are covered by a single notification, a representative list of such works at that site.
   - Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit the service provider to locate the material.
   - Information reasonably sufficient to permit the service provider to contact the complaining party, such as an address, telephone number, and, if available, an electronic mail address at which the complaining party may be contacted.
   - A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
   - A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

   Notifications must be sent to contact@vibehouse.net or by mail to: 720 Montague Ave #101, Greenwood, SC 29649, USA.

2. **Response**: Upon receipt of a valid DMCA notice, we will promptly remove or disable access to the infringing material and notify the user who posted it.

3. **Counter-Notice**: If you believe that the material was removed or disabled by mistake or misidentification, you can send us a counter-notice containing the following:
   - Your physical or electronic signature.
   - Identification of the material that has been removed or to which access has been disabled and the location at which the material appeared before it was removed or disabled.
   - A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification of the material to be removed or disabled.
   - Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court for the judicial district in which the address is located, or if your address is outside of the United States, for any judicial district in which the service provider may be found, and that you will accept service of process from the person who provided notification or an agent of such person.

## Intellectual Property Rights

### Ownership
The content on memeSRC.com, including but not limited to text, graphics, images, logos, button icons, digital downloads, data compilations, software, and the compilation of any of these elements (collectively, "Proprietary Content"), is the property of Vibe House LLC, its affiliates or its content suppliers, and is protected by United States and international copyright, trademark laws, and other intellectual property rights.

### Trademarks
The trademarks, service marks, logos, and trade names displayed on the service (collectively, "Trademarks") are registered and unregistered Trademarks of Vibe House LLC and others. Nothing contained on memeSRC.com should be construed as granting, by implication, estoppel, or otherwise, any license or right to use any Trademark displayed on the service without the written permission of Vibe House LLC or such third party that may own the Trademarks. Misuse of any Trademarks, or any other content, displayed on memeSRC.com is prohibited.

### Restrictions
You may not copy, reproduce, modify, lease, loan, sell, create derivative works from, upload, transmit, or distribute the Proprietary Content of memeSRC.com in any way without Vibe House LLC's prior written permission or as expressly provided otherwise in these Terms. All rights not expressly granted here are reserved by Vibe House LLC.

### User-Generated Content
While you retain all rights to the content you upload or create using memeSRC.com, by posting content to the site, you grant Vibe House LLC a non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable right to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content throughout the world in any media.

We respect the intellectual property of others and ask our users to do the same. We may, in appropriate circumstances and at our discretion, terminate the accounts of users who infringe the intellectual property rights of others.

### Reporting Infringement
If you believe that your intellectual property rights have been violated, please inform us following the procedure outlined in the Copyright Compliance and DMCA Policy section. We will investigate the matter and take appropriate action.

By using memeSRC, you acknowledge and agree to respect the intellectual property rights of Vibe House LLC and others, and to comply with all applicable laws regarding the protection of these rights.

## Account Management

You are responsible for maintaining the security of your account and for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate these Terms.

## Subscriptions and Payments

We offer premium subscription services. The terms of any subscriptions, including cancellation and refund policies, will be clearly communicated at the time of purchase.

## Communications

By creating an account, you agree to receive communications from us related to your account and our services. You can opt out of non-essential communications at any time.

## Modifications to the Terms

We may update these Terms from time to time. If we make changes, we will notify you, for example, by posting an announcement on our website. By continuing to use the Service after these changes are made, you agree to the revised Terms.

## Service Interruptions

While we strive to ensure that the Service is always available, interruptions may occur for maintenance or due to circumstances beyond our control. We apologize for any inconvenience this may cause.

## memeSRC Pro Subscription

memeSRC Pro is a premium subscription service available exclusively to residents of the United States, Canada, and Australia. By subscribing to memeSRC Pro, you gain access to a range of enhanced features designed to improve your experience on our platform.

### Benefits of memeSRC Pro
As a memeSRC Pro subscriber, you will enjoy the following benefits:
- **Ad-Free Experience**: Browse and use memeSRC.com without any advertisements.
- **Priority Support**: Get faster responses and support from our dedicated team.
- **Early Access to Features**: Gain early access to new features before they are rolled out to all users.
- **Magic Credits**: Receive a monthly allowance of Magic Credits to use our AI-powered editing tools. These credits are issued monthly and expire at the end of each month. They do not roll over to the next month.

### Magic Credits Allowance
Depending on the subscription plan you choose, you will receive a different number of Magic Credits each month:
- **Basic Plan**: 5 credits per month
- **Standard Plan**: 25 credits per month
- **Premium Plan**: 69 credits per month

You may use up to the number of credits issued in your plan each month. Unused credits will expire and will not be carried over to the next month.

### Subscription Payment and Renewal
By subscribing to memeSRC Pro, you authorize Vibe House LLC to automatically charge your payment method each month. Charges will appear on your statement as "VIBE HOUSE LLC". The subscription fee will be charged at the beginning of the paying portion of your subscription and each month thereafter unless and until you cancel your subscription.

### Geographic Restrictions
memeSRC Pro is available to residents of the United States, Canada, and Australia only. By subscribing, you confirm that you are a resident of one of these countries.

### Cancellation
You may cancel your memeSRC Pro subscription at any time. Please note that upon cancellation, access to subscription benefits, including unused Magic Credits, will be terminated immediately without any entitlement to a refund (unless explicitly required by the laws of your region). 

We recommend that you carefully review this policy, ensuring that it aligns with your operational practices and legal advice, particularly regarding consumer protection laws in both the U.S., Canada, and Australia.

Please note that by subscribing to memeSRC Pro, you agree to these terms and the conditions outlined in the rest of this agreement. If you have any questions or need assistance with your subscription, please contact our support team.

## Donations

memeSRC accepts donations from users who wish to support our platform. Please note that memeSRC is not a charitable organization, and therefore, donations made to memeSRC are not tax-deductible as charitable contributions. This applies to residents of the United States, Canada, and Australia, where our donation feature is available.

By making a donation, you understand and agree that your contribution is a voluntary gift to support the operations of memeSRC and is not connected to any tangible goods or services in return. We offer no guarantees regarding the use of donated funds; however, we commit to utilizing these contributions to enhance the platform and user experience.

## Refunds

memeSRC generally does not offer refunds for any products or services purchased, including memeSRC Pro subscriptions and donations. Refunds are only issued under extenuating circumstances or where required by law.

In jurisdictions where consumers have statutory rights to receive refunds on digital goods and services under certain conditions, such as a major failure on our part to provide the service as described, we will comply with these laws.

If you believe your situation warrants a refund, please contact our customer service team with a detailed explanation of your case. Each request will be evaluated on a case-by-case basis in accordance with our policies and applicable law.

## Cancellation

You may cancel your memeSRC Pro subscription at any time. Please note that upon cancellation, access to subscription benefits, including unused Magic Credits, will be terminated immediately without any entitlement to a refund. We encourage you to consider your need for ongoing services prior to cancellation.

## Limitation of Liability

We are not liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.

## Indemnification

You agree to defend, indemnify, and hold harmless Vibe House LLC, its affiliates, officers, directors, employees, agents, licensors, and service providers, from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms of Service or your use of memeSRC.com, including, but not limited to, your user content, any use of the website's content, services, and products other than as expressly authorized in these Terms of Service or your use of any information obtained from the website.

This indemnification obligation will survive the termination of your account or your use of memeSRC.com. We reserve the right to take over the exclusive defense of any claim for which we are entitled to indemnification under this section. In such event, you shall provide us with such cooperation as is reasonably requested by us.

## Third-Party Links and Services

memeSRC.com may contain links to third-party websites, advertisers, services, special offers, or other events or activities that are not owned or controlled by Vibe House LLC. We do not endorse or assume any responsibility for any such third-party sites, information, materials, products, or services. If you access any third party website, service, or content from memeSRC.com, you do so at your own risk, and you agree that Vibe House LLC will have no liability arising from your use of or access to any third-party website, service, or content.

### Third-Party Services
Currently, memeSRC uses services including Google Analytics for website traffic analysis, Google AdSense for advertising, Stripe for payment processing, and Google Forms for surveys and feedback collection. These services collect data as specified in their respective privacy policies and use it to provide valuable insights, targeted advertisements, and secure payment processing, which help improve the functionality and user experience of our website. We do not control these third parties' tracking technologies or how they may be used.

### Disclaimers
We do not guarantee the accuracy, completeness, or usefulness of any content provided by third parties, nor do we warrant the offerings of any of these entities/individuals or their websites. You acknowledge and agree that Vibe House LLC shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods, or services available on or through any such third-party sites or services. Your interactions with organizations and/or individuals found on or through the service, including payment and delivery of goods or services, and any other terms, conditions, warranties, or representations associated with such dealings, are solely between you and such organizations and/or individuals.

Please review carefully the third-party's policies and practices and make sure you understand them before you engage in any transaction. Complaints, claims, concerns, or questions regarding third-party products should be directed to the third-party.

## Arbitration and Class Action Waiver

### Arbitration Agreement
By using the memeSRC.com service, you agree to arbitrate disputes through binding and final arbitration, instead of in court. You and Vibe House LLC hereby waive any right to a jury trial. This arbitration agreement applies to all claims under any legal theory unless the claim fits within the exceptions below. It remains in effect after your relationship with Vibe House LLC ends.

### Exceptions
This arbitration agreement does not require arbitration for small claims court actions brought individually in the jurisdiction of your residence or where prohibited by law. Additionally, both you and Vibe House LLC retain the right to apply to any court of competent jurisdiction for provisional relief, including pre-arbitral injunctions.

### Rules of Arbitration
The arbitration will be administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules, as amended by these Terms of Service. The arbitration will be conducted in the English language, in the city of Greenwood, South Carolina, USA, unless otherwise agreed upon.

### No Class Actions
You may only resolve disputes with us on an individual basis and may not bring a claim as a plaintiff or a class member in a class, consolidated, or representative action. Class arbitrations, class actions, private attorney general actions, and consolidation with other arbitrations are not allowed under our arbitration agreement.

### Opt-Out of Agreement to Arbitrate
You have the right to opt-out of the arbitration agreement by sending written notice of your decision to opt-out to: contact@vibehouse.net within 30 days after first becoming subject to this arbitration provision. Your notice must include your name and address, your memeSRC username (if any), the email address you used to set up your memeSRC account (if you have one), and an unequivocal statement that you want to opt out of this arbitration agreement. If you opt-out of arbitration, all other parts of these Terms of Service will continue to apply to you.

### Modifications
This arbitration agreement is subject to modification by Vibe House LLC at any time. If we make any substantial changes to the arbitration agreement, we will notify you through suitable means, such as by posting on our website or sending you an email. Continued use of our service after changes to the arbitration agreement constitutes your consent to the modified arbitration agreement.

### Severability
If any part of this Arbitration and Class Action Waiver is ruled to be unenforceable, the remainder of this section will remain in effect and be construed in accordance with its terms as if the unenforceable provision were not contained herein.

## Governing Law

These Terms are governed by the laws of the State of South Carolina, USA. Disputes arising from these Terms will be resolved in the federal or state courts located in Greenwood, South Carolina.

## Contact Us

If you have any questions or concerns about these Terms, please contact us at contact@vibehouse.net or by mail to: 720 Montague Ave #101, Greenwood, SC 29649, USA.

Thank you for choosing memeSRC.com!
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
