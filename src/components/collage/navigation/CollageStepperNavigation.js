import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Typography,
  MobileStepper,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CardContent,
  Paper,
  alpha
} from "@mui/material";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Check
} from "@mui/icons-material";

import { StepCard } from "../styled/CollageStyled";

const CollageStepperNavigation = ({
  steps,
  activeStep,
  setActiveStep,
  selectedImages,
  selectedTemplate,
  compatibleTemplates,
  panelCount,
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handler for clicking on a step label to navigate
  const handleStepClick = (stepIndex) => {
    // For step 1 (layout/settings), always allow navigation
    if (stepIndex === 0) {
      setActiveStep(0);
      return;
    }
    
    // For step 2 (images), we need a compatible template
    if (stepIndex === 1 && compatibleTemplates.length > 0 && selectedTemplate) {
      setActiveStep(1);
      return;
    }
    
    // For step 3 (arrange), we need images and a template
    if (stepIndex === 2 && selectedImages.length > 0 && selectedTemplate) {
      setActiveStep(2);
    }
  };

  // Check if a step is clickable
  const isStepClickable = (index) => {
    if (index === 0) return true; // First step is always clickable
    if (index === 1) return compatibleTemplates.length > 0 && selectedTemplate; // Need template for step 2
    if (index === 2) return selectedImages.length > 0 && selectedTemplate; // Need images and template for step 3
    return false;
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Mobile stepper component
  if (isMobile) {
    return (
      <Box>
        {/* Mobile step indicator - simplified pill style */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mb: 3,
          overflow: 'hidden',
          borderRadius: 5,
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          backgroundColor: alpha(theme.palette.background.paper, 0.5)
        }}>
          {steps.map((step, index) => (
            <Box
              key={index}
              onClick={() => isStepClickable(index) && handleStepClick(index)}
              sx={{
                flex: 1,
                py: 1,
                px: isSmallMobile ? 1 : 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isStepClickable(index) ? 'pointer' : 'default',
                backgroundColor: activeStep === index 
                  ? theme.palette.primary.main 
                  : 'transparent',
                color: activeStep === index 
                  ? theme.palette.primary.contrastText 
                  : theme.palette.text.primary,
                opacity: isStepClickable(index) ? 1 : 0.5,
                '&:hover': {
                  backgroundColor: isStepClickable(index) && activeStep !== index 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : undefined
                }
              }}
            >
              {activeStep > index ? (
                <Check fontSize="small" sx={{ mr: isSmallMobile ? 0 : 0.5 }} />
              ) : (
                <Box 
                  component="span"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: isSmallMobile ? 0 : 0.5 
                  }}
                >
                  {step.icon}
                </Box>
              )}
              {!isSmallMobile && <Typography variant="body2">{step.label}</Typography>}
            </Box>
          ))}
        </Box>

        {/* Content area */}
        <Box mb={2} px={isSmallMobile ? 0 : 1}>
          {children}
        </Box>
      </Box>
    );
  }

  // Desktop stepper component
  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
      <Stepper
        activeStep={activeStep} 
        sx={{ 
          mb: 4,
          '& .MuiStepConnector-line': {
            borderColor: alpha(theme.palette.divider, 0.3)
          }
        }}
      >
        {steps.map((step, index) => (
          <Step 
            key={step.label}
            completed={activeStep > index}
            sx={{
              '& .MuiStepLabel-root': {
                cursor: isStepClickable(index) ? 'pointer' : 'default',
              }
            }}
          >
            <StepLabel
              onClick={() => isStepClickable(index) && handleStepClick(index)}
              StepIconProps={{
                sx: {
                  color: activeStep === index 
                    ? theme.palette.primary.main 
                    : alpha(theme.palette.text.primary, 0.3),
                  '&.Mui-completed': {
                    color: theme.palette.success.main
                  }
                }
              }}
            >
              <Typography 
                variant="subtitle2"
                sx={{ 
                  opacity: isStepClickable(index) ? 1 : 0.6,
                  fontWeight: activeStep === index ? 600 : 400 
                }}
              >
                {step.label}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {step.description}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content area */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};

export default CollageStepperNavigation; 