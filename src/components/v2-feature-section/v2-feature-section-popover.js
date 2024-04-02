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
} from "@mui/material";
import { useEffect, useState } from "react";
import PlatformUpdates from "./sections/platform-updates";
import EditorUpdates from "./sections/editor-updates";
import MemeSrcPro from "./sections/memesrc-pro";

const sections = [
    { title: "Editor Updates", color: "#ff8d0a", textColor: '#FFFFFF', component: (props) => <EditorUpdates {...props} /> },
    { title: "Platform Updates", color: "#0069cc", textColor: '#FFFFFF', component: (props) => <PlatformUpdates {...props} /> },
    { title: "memeSRC Pro", color: "#34933f", textColor: '#FFFFFF', component: (props) => <MemeSrcPro {...props} /> },
];

export default function FeatureSectionPopover({ children }) {
    const isMd = useMediaQuery((theme) => theme.breakpoints.up("md"));
    const [currentSection, setCurrentSection] = useState(0);
    const [open, setOpen] = useState(false);

    const handleNext = () => {
        setCurrentSection((prevSection) => prevSection + 1);
    };

    const handleBack = () => {
        setCurrentSection((prevSection) => prevSection - 1);
    };

    const handleClose = () => {
        localStorage.setItem('featurePopoverDismissed', 'true');
        setOpen(false);
    };
    
    useEffect(() => {
        const dismissed = localStorage.getItem('featurePopoverDismissed');
        if (!dismissed) {
            setOpen(true);
        }
    }, []);
    

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
                        borderRadius: isMd ? 5 : 0,
                        backgroundColor: sections[currentSection].color,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        pt: isMd ? 3 : 2,
                        pb: isMd ? 1 : 0.5,
                        background: `linear-gradient(45deg,
                            #5461c8 12.5% /* 1*12.5% */,
                            #c724b1 0, #c724b1 25%   /* 2*12.5% */,
                            #e4002b 0, #e4002b 37.5% /* 3*12.5% */,
                            #ff6900 0, #ff6900 50%   /* 4*12.5% */,
                            #f6be00 0, #f6be00 62.5% /* 5*12.5% */,
                            #97d700 0, #97d700 75%   /* 6*12.5% */,
                            #00ab84 0, #00ab84 87.5% /* 7*12.5% */,
                            #00a3e0 0)`
                    }}
                >
                    <img
                        src="https://beta.memesrc.com/assets/memeSRC-white.svg"
                        alt="memeSRC logo"
                        style={{ height: isMd ? 48 : 40, marginBottom: 8 }}
                    />
                    <Typography fontSize={isMd ? 32 : 24} fontWeight={700}>
                        memeSRC v2
                    </Typography>
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
                        }}
                        onClick={handleClose}
                    >
                        <Close sx={{ color: 'white'}} />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 0, height: '100%' }}>
                    <Box sx={{ flex: 1, overflowY: "auto", height: '100%' }}>
                        {sections[currentSection].component({
                            backgroundColor: sections[currentSection].color,
                            textColor: sections[currentSection].textColor,
                        })}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ display: 'block', py: 2, backgroundColor: 'black' }} disableSpacing>
                    <Box width='100%'>
                        <LinearProgress
                            variant="determinate"
                            value={(currentSection / (sections.length - 1)) * 100}
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
                            disabled={currentSection === 0}
                            onClick={handleBack}
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
                            onClick={currentSection === sections.length - 1 ? handleClose : handleNext}
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
            </Dialog>
        </>
    );
}