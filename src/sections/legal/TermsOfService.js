import { Container, styled } from "@mui/material";
import { Helmet } from "react-helmet-async";
import Logo from "../../components/logo/Logo";


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

export default function TermsOfService() {
  return (

    <>
      <Helmet>
        <title> Terms of Service • memeSRC </title>
      </Helmet>

      <StyledRoot>
        <Logo
          sx={{
            position: 'fixed',
            top: { xs: 16, sm: 24, md: 40 },
            left: { xs: 16, sm: 24, md: 40 },
          }}
        />

        <Container maxWidth="md">
          <StyledContent>
            <h2>Terms of Service</h2>
            <p>Please read these terms of service ("terms", "terms of service") carefully before using <a href="http://memesrc.com">http://memesrc.com</a> website (the "service") operated by Vibe House LLC ("us", "we", "our").</p>

            <h3>Conditions of Use</h3>
            <p>We will provide their services to you, which are subject to the conditions stated below in this document. Every time you visit this website, use its services or make a purchase, you accept the following conditions. This is why we urge you to read them carefully.</p>

            <h3>Privacy Policy</h3>
            <p>Before you continue using our website we advise you to read our privacy policy regarding our user data collection. It will help you better understand our practices.</p>

            <h3>Copyright and Fair Use</h3>
            <p>The memeSRC project intends to operate within the bounds of "17 U.S. Code § 107 - Limitations on exclusive rights: Fair use". memeSRC provides a tool for artists, journalists, etc. to research, critique, and make social comment about the works themselves. memeSRC does not own the rights to indexed content, nor is it affiliated with the copyright owners of the indexed content.</p>
            <p>If you believe that your work has been copied in a way that constitutes copyright infringement, please provide Vibe House LLC the following information: an electronic or physical signature of the person authorized to act on behalf of the owner of the copyright; a description of the copyrighted work that you claim has been infringed; a description of where the material that you claim is infringing is located on the site; your address, telephone number, and email address; a statement by you that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law; a statement by you, made under penalty of perjury, that the above information in your Notice is accurate and that you are the copyright owner or authorized to act on the copyright owner's behalf. Reports can be submitted to <a href="mailto:contact@vibehouse.net">contact@vibehouse.net</a>, or mailed to 720 Montague Ave #101, Greenwood, SC 29649.</p>

            <h3>Communications</h3>
            <p>The entire communication with us is electronic. Every time you send us an email or visit our website, you are going to be communicating with us. You hereby consent to receive communications from us. If you subscribe to the news on our website, you are going to receive regular emails from us. We will continue to communicate with you by posting news and notices on our website and by sending you emails. You also agree that all notices, disclosures, agreements, and other communications we provide to you electronically meet the legal requirements that such communications be in writing.</p>

            <h3>Applicable Law</h3>
            <p>By visiting this website, you agree that the laws of the United States of America, without regard to principles of conflict laws, will govern these terms of service, or any dispute of any sort that might come between Vibe House LLC and you, or its business partners and associates.</p>

            <h3>Disputes</h3>
            <p>Any dispute related in any way to your visit to this website or to products you purchase from us shall be arbitrated by state or federal court United States of America and you consent to exclusive jurisdiction and venue of such courts.</p>

            <h3>License and Site Access</h3>
            <p>We grant you a limited license to access and make personal use of this website. You are not allowed to download or modify it. This may be done only with written consent from us.</p>
          </StyledContent>
        </Container>
      </StyledRoot>
    </>
  )
}
