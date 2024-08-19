import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Card,
  CardContent,
  Button,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/system';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ClearIcon from '@mui/icons-material/Clear';
import ReactMarkdown from 'react-markdown';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const FAQContainer = styled(Box)(({ theme }) => ({
  maxWidth: 800,
  margin: '0 auto',
  padding: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const FAQTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.primary.white,
}));

const FAQAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  boxShadow: 'none',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 'auto',
  },
}));

const FAQAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&.Mui-expanded': {
    minHeight: 'auto',
  },
  '& .MuiAccordionSummary-content': {
    margin: '0',
  },
  marginTop: theme.spacing(2),
}));

const FAQAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  '&.Mui-expanded': {
    marginBottom: theme.spacing(3),
  },
}));

const QuestionIndicator = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginRight: theme.spacing(1),
  color: theme.palette.primary.main,
}));

const FAQReminder = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const ProCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  position: 'relative',
}));

const ProCardContent = styled(CardContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.primary.dark,
  position: 'relative',
  zIndex: 1,
}));

const ProCardBackground = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.primary.main,
  opacity: 0.8,
  zIndex: 0,
}));

const ProButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.secondary.main,
  color: theme.palette.secondary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.secondary.dark,
  },
}));

const MarkdownListItem = styled('li')(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const MarkdownLink = styled('a')(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.common.white,
  textDecoration: 'underline',
  '&:hover': {
    textDecoration: 'none',
  },
}));

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { openSubscriptionDialog } = useSubscribeDialog();

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredFAQs = [
    {
      question: 'How can I find templates for a specific scene or quote?',
      answer: `Type a quote into [the search bar](/) to find templates:

1. Search by quote across "🌈 All Shows & Movies", or
2. Use the dropdown to select a specific index.

Remember, content is indexed from user uploads, so if it's not there it might not have been indexed yet.`,
    },
    {
      question: 'Is it possible to edit images or add captions?',
      answer: `Yes, it's possible to edit images and add captions! Here's how:

1. Open a search result.
2. Enable captions.
3. Add or change captions directly under the image using our Caption Editor.
4. For more complex edits, like adding multiple text layers or using Magic Tools, switch to the Advanced Editor by clicking the button under the caption.`,
    },
    {
      question: 'Can I edit my own pictures with memeSRC?',
      answer: `Yes, you can absolutely edit your own pictures using all of memeSRC's features, including the powerful Magic Tools! Here's how to get started:

1. Go to [the upload page](/edit) and select the image you want to edit from your device.
2. Once uploaded, you'll be taken directly to the Advanced Editor.
3. Use the Magic Tools like the Magic Eraser and Magic Fill to customize your image in creative ways.
4. Add one or more captions, click (or tap) and drag to move them, change their color, adjust formatting, etc.
5. Click "Save, Copy, Share" to download your masterpiece and share it with the world!`,
    },
    {
      question: 'What are Magic Tools, and how do they work?',
      answer: `Magic Tools in the Advanced Editor allow for sophisticated edits, such as erasing parts of an image with the Magic Eraser or creatively adding to it with Magic Fill. These tools are a great way to quickly make the assets you need`,
    },
    {
      question: 'How can I save the memes I create?',
      answer: `Saving your memes is easy! Here's how:

For memes created with the Basic Editor:
1. Tap and hold or right-click on the image to save it.

For memes created with the Advanced Editor:
1. Use the Magic Tools or add text layers to customize your meme.
2. Click the "Save, Copy, Share" option to download your creation.`,
    },
    {
      question: 'What is the Random Button and how does it function?',
      answer: `The Random Button, located at the bottom right of every page, fetches a random frame from our database. If you're browsing a specific show or movie, it'll pull a frame from that selection. It's a great way to find inspiration or start a new meme!`,
    },
    {
      question: 'Can I request for a show or movie to be added?',
      answer: `Yes, we welcome your requests! If your favorite show or movie isn't on memeSRC, use the Request and Voting feature found in the menu. We regularly review these requests to add new content based on popularity and demand.`,
    },
    {
      question: 'How can I provide feedback or support?',
      answer: `We value your feedback and support! Click the feedback icon, located near the donation icon at the bottom of the page, to share your thoughts or to donate. Your contributions help us improve and expand the platform.`,
    },
    {
      question: 'Why do I have a charge from "VIBE HOUSE LLC"?',
      answer: `When you subscribe to memeSRC Pro, the charge will appear as "VIBE HOUSE LLC" on your bank statement. Vibe House LLC is the parent company of memeSRC and handles billing for memeSRC Pro subscriptions. If you have any questions about this charge or your memeSRC Pro subscription, please contact us at contact@vibehouse.net.`,
    }
  ].filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FAQContainer>
      <FAQTitle variant="h4">Frequently Asked Questions</FAQTitle>
      <ProCard>
        <ProCardBackground />
        <ProCardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Need personalized help?
          </Typography>
          <Typography variant="body1" align="center">
            Get Pro Support with memeSRC Pro!
          </Typography>
          <ProButton variant="contained" onClick={openSubscriptionDialog}>
            Learn More
          </ProButton>
        </ProCardContent>
      </ProCard>
      <TextField
        label="Search FAQs"
        variant="outlined"
        fullWidth
        margin="normal"
        value={searchQuery}
        onChange={handleSearch}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {searchQuery && (
                <IconButton
                  aria-label="clear search"
                  onClick={() => setSearchQuery('')}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />
      {filteredFAQs.map((faq, index) => (
        <FAQAccordion key={index}>
          <FAQAccordionSummary expandIcon={<ExpandMoreIcon />}>
            <QuestionIndicator variant="h6">Q:</QuestionIndicator>
            <Typography variant="h6">{faq.question}</Typography>
          </FAQAccordionSummary>
          <FAQAccordionDetails>
            <ReactMarkdown
              components={{
                li: MarkdownListItem,
                a: MarkdownLink,
              }}
            >
              {faq.answer}
            </ReactMarkdown>
          </FAQAccordionDetails>
        </FAQAccordion>
      ))}
      <FAQReminder variant="body2">
        Just remember, all the content on memeSRC comes from users like you, so
        let's keep things creative and respectful. Have fun memeing!
      </FAQReminder>
    </FAQContainer>
  );
};

export default FAQPage;
