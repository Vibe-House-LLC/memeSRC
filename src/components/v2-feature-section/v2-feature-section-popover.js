import { Close, ArrowBack, ArrowForward, Check } from "@mui/icons-material";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Typography,
    useMediaQuery,
    Box,
    Button,
    LinearProgress,
    DialogActions,
    Fade,
    Link,
    Container,
    Grow,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PlatformUpdates from "./sections/platform-updates";
import EditorUpdates from "./sections/editor-updates";
import MemeSrcPro from "./sections/memesrc-pro";

const sections = [
    { title: "Editor Updates", color: "#34933f", textColor: '#FFFFFF', component: (props) => <EditorUpdates {...props} /> },
    { title: "Platform Updates", color: "#ff8d0a", textColor: '#FFFFFF', component: (props) => <PlatformUpdates {...props} /> },
    { title: "memeSRC Pro", color: "#0069cc", textColor: '#FFFFFF', component: (props) => <MemeSrcPro {...props} /> },
];

export default function FeatureSectionPopover({ children }) {
    const location = useLocation();
    const isMd = useMediaQuery((theme) => theme.breakpoints.up("md"));
    const [currentSection, setCurrentSection] = useState(0);
    const [open, setOpen] = useState(false);
    const [showLanding, setShowLanding] = useState(true);
    const [progress, setProgress] = useState(0);

    const handleNext = () => {
        setCurrentSection((prevSection) => prevSection + 1);
        setProgress((prevProgress) => prevProgress + 25);
    };

    const handleBack = () => {
        setCurrentSection((prevSection) => prevSection - 1);
        setProgress((prevProgress) => prevProgress - 25);
    };

    const handleClose = () => {
        localStorage.setItem('featurePopoverDismissed', 'true');
        setOpen(false);
    };

    useEffect(() => {
        const dismissed = localStorage.getItem('featurePopoverDismissed');
        if (!dismissed && location.pathname !== '/pro') {
            setOpen(true);
        }

        if (location.pathname === '/pro') {
            localStorage.setItem('featurePopoverDismissed', 'true');
        }
    }, [location]);


    return (
        <>
            {children}
            <Dialog
                open={open}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                maxWidth="sm"
                fullWidth
                fullScreen={!isMd}
                scroll="paper"
                PaperProps={{
                    sx: {
                        borderRadius: isMd ? 3 : 0,
                        backgroundColor: showLanding ? 'black' : sections[currentSection].color,
                    },
                }}
            >

                <DialogContent sx={{ pt: 0, height: '100%', position: 'relative' }}>
                    <IconButton
                        size="large"
                        sx={{
                            position: "absolute",
                            top: isMd ? 10 : 5,
                            right: 10,
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            },
                            zIndex: 8000
                        }}
                        onClick={handleClose}
                    >
                        <Close sx={{ color: 'white' }} />
                    </IconButton>
                    {showLanding ?
                        <Fade in timeout={800}>
                            <Box sx={{ flex: 1, overflowY: "auto", height: '100%' }}>
                                <Container
                                    maxWidth="md"
                                    sx={{
                                        backgroundColor: 'black',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        height: '100%',
                                        pt: 0,
                                        pb: 2
                                    }}
                                >
                                    <Box
                                        sx={{
                                            textAlign: 'left',
                                            px: 2,
                                            width: '100%',
                                            my: 'auto',
                                            pt: 5,
                                            pb: 8
                                        }}
                                    >
                                        <Grow in timeout={1000}>
                                            <Box>
                                                {/* <Typography fontSize={isMd ? 18 : 20} fontWeight={700} gutterBottom sx={{ color: 'white' }} textAlign='center'>
                                                    Welcome to
                                                </Typography> */}
                                                <center>
                                                    <img
                                                        src="/assets/memeSRC-white.svg"
                                                        alt="memeSRC logo"
                                                        style={{ height: isMd ? 58 : 48, marginBottom: 2 }}
                                                    />
                                                    <Typography fontSize={isMd ? 38 : 38} fontWeight={700}>
                                                        memeSRC v2
                                                    </Typography>
                                                </center>
                                                <Typography fontSize={18} fontWeight={700} sx={{ color: 'white' }} pt={2} textAlign='center'>
                                                    We've updated memeSRC with some cool new features and made big improvements behind-the-scenes.
                                                </Typography>
                                            </Box>
                                        </Grow>
                                    </Box>
                                    <Box sx={{ mt: 'auto' }}>
                                        <Button
                                            onClick={() => {
                                                setShowLanding(false);
                                                setTimeout(() => {
                                                    setProgress(25)
                                                }, 100)
                                            }}
                                            variant="contained"
                                            fullWidth
                                            sx={{
                                                color: "black",
                                                py: 1,
                                                borderRadius: 5,
                                                fontSize: 20,
                                                backgroundColor: theme => theme.palette.success.main,
                                                "&:hover": {
                                                    backgroundColor: theme => theme.palette.success.dark,
                                                },
                                                mb: 2
                                            }}
                                        >
                                            See what's new
                                        </Button>
                                        <center>
                                            <Link
                                                onClick={handleClose}
                                                sx={{
                                                    color: theme => theme.palette.grey[500],
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                I don't care.
                                            </Link>
                                        </center>
                                    </Box>
                                </Container>

                            </Box>
                        </Fade>
                        :
                        <Box sx={{ flex: 1, overflowY: "auto", height: '100%' }}>
                            {sections[currentSection].component({
                                backgroundColor: sections[currentSection].color,
                                textColor: sections[currentSection].textColor,
                            })}
                        </Box>
                    }
                </DialogContent>
                {!showLanding &&
                    <DialogActions sx={{ display: 'block', pb: 2 }} disableSpacing>
                        <Box width='100%'>
                            <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                    height: 20,
                                    borderRadius: 10,
                                    "& .MuiLinearProgress-bar": {
                                        backgroundImage: `repeating-linear-gradient(45deg,
                                                    #5461c8 0%, #5461c8 12.5%,     /* 1*12.5% */
                                                    #c724b1 12.5%, #c724b1 25%,   /* 2*12.5% */
                                                    #e4002b 25%, #e4002b 37.5%,   /* 3*12.5% */
                                                    #ff6900 37.5%, #ff6900 50%,   /* 4*12.5% */
                                                    
                                                    #97d700 62.5%, #97d700 75%,   /* 6*12.5% */
                                                    #00ab84 75%, #00ab84 87.5%,   /* 7*12.5% */
                                                    #00a3e0 87.5%, #00a3e0 100%   /* 8*12.5% */
                                                )`,
                                        backgroundSize: '200% 100%',
                                        borderRadius: 10,
                                    },
                                    "& .MuiLinearProgress-root": {
                                        backgroundColor: theme => theme.palette.getContrastText(sections[currentSection].color),
                                        borderRadius: 10,
                                    },
                                    "& .MuiLinearProgress-dashed": {
                                        backgroundImage: "none",
                                    },
                                }}
                            />

                            {/* <Box sx={{ display: "flex", justifyContent: "center", px: 2, pt: 1 }}>
                            <Typography variant="body2" color="text.primary">
                                {sections[currentSection].title}
                            </Typography>
                        </Box> */}
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 2,
                                px: 2
                            }}
                        >
                            <IconButton
                                onClick={currentSection === 0 ? () => { setShowLanding(true); setProgress(0) } : handleBack}
                                sx={{
                                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                                    color: "white",
                                    "&:hover": {
                                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                                    },
                                    "&.Mui-disabled": {
                                        opacity: 0.5,
                                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                                    },
                                }}
                            >
                                <ArrowBack />
                            </IconButton>
                            {/* <IconButton
                            onClick={currentSection === sections.length - 1 ? handleClose : handleNext}
                            sx={{
                                backgroundColor: "rgba(0, 0, 0, 0.2)",
                                color: "white",
                                "&:hover": {
                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                },
                                "&.Mui-disabled": {
                                    opacity: 0.5,
                                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                                },
                            }}
                        >
                            {currentSection === sections.length - 1 ? <Check /> : <ArrowForward />}
                        </IconButton> */}
                            <Button
                                variant="contained"
                                onClick={currentSection === sections.length - 1 ? () => { handleClose(); setProgress(100); } : handleNext}
                                endIcon={currentSection === sections.length - 1 ? <Check /> : <ArrowForward />}
                                sx={{
                                    backgroundColor: theme => theme.palette.success.main,
                                    color: "black",
                                    fontSize: 18,
                                    px: 4,
                                    borderRadius: 5,
                                    "&:hover": {
                                        backgroundColor: theme => theme.palette.success.dark,
                                    },
                                    "&.Mui-disabled": {
                                        opacity: 0.5,
                                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                                    },
                                }}
                            >
                                {currentSection === sections.length - 1 ? 'Done' : 'Next'}
                            </Button>
                        </Box>
                    </DialogActions>
                }
            </Dialog >
        </>
    );
}