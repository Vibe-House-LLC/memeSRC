// import { API } from "aws-amplify";
// import getSessionID from "./getSessionsId";
// import fetchShows from "./fetchShows";
// import getRandomIndex from "./getRandomIndex";
// import loadV2Csv from "./loadV2Csv";


// export default async function loadRandomFrame(show = "_universal", loadingRandom = false, setLoadingRandom = () => { }) {

//     // Set the loading state
//     setLoadingRandom(true);

//     // Load the shows
//     const shows = await fetchShows();

//     // Here we set the show object by either using the provided show or by selecting a random one.
//     const showObject = (show !== '_universal') ? shows.find(singleShow => singleShow.id === show) : getRandomIndex(shows)

//     // Next we check to see if the selected show is version 2 or not and handle it accordingly.
//     if (showObject?.version === 2) {
//         const loadedShowSubtitles = await loadV2Csv(showObject.id)
//         const randomSubtitle = getRandomIndex(loadedShowSubtitles)
//         setLoadingRandom(false)
//         console.log(randomSubtitle)
//     } else {
//         getSessionID().then((sessionId) => {
//             const apiName = 'publicapi';
//             const path = '/random';
//             const myInit = {
//                 queryStringParameters: {
//                     series: showObject.id,
//                     sessionId,
//                 },
//             };

//             API.get(apiName, path, myInit)
//                 .then((response) => {
//                     const fid = response.frame_id;
//                     console.log(fid);
//                     window.location.href = `/frame/${fid}`;
//                     setLoadingRandom(false);
//                 })
//                 .catch((error) => {
//                     console.error(error);
//                     setLoadingRandom(false);
//                 });

//         });
//     }
// }


import { useContext, useState } from 'react';
import { API } from "aws-amplify";
import { useNavigate } from 'react-router-dom';
import getSessionID from "./getSessionsId";
import getRandomIndex from "./getRandomIndex";
import loadV2Csv from "./loadV2Csv";
import findMidpoint from './findMidpoint';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';

function useLoadRandomFrame() {
    const [loadingRandom, setLoadingRandom] = useState(false);
    const { shows } = useContext(UserContext)
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { setShowObj } = useSearchDetailsV2();

    const loadRandomFrame = async (show = "_universal") => {
        setLoadingRandom(true);
        setError(null);

        try {
            // const shows = await fetchShows();
            console.log(show)
            let showObject;
            if (show === '_universal') {
                showObject = getRandomIndex(shows)
            } else if (show === '_favorites') {
                showObject = getRandomIndex(shows.filter(show => show.isFavorite))
            } else {
                showObject = shows.find(singleShow => singleShow.id === show)
            }
            console.log(showObject)

            if (showObject?.version === 2) {
                const loadedShowSubtitles = await loadV2Csv(showObject.id);
                setShowObj(loadedShowSubtitles)
                const randomSubtitle = getRandomIndex(loadedShowSubtitles);
                const midpointFrame = findMidpoint(randomSubtitle.start_frame, randomSubtitle.end_frame);
                const roundedFrame = Math.round(midpointFrame / 10) * 10; // Round to the nearest whole second
                setLoadingRandom(false)
                navigate(`/frame/${showObject.id}/${randomSubtitle.season}/${randomSubtitle.episode}/${roundedFrame}`)
            } else {
                const sessionId = await getSessionID();
                const apiName = 'publicapi';
                const path = '/random';
                const myInit = {
                    queryStringParameters: {
                        series: showObject.id,
                        sessionId,
                    },
                };

                const response = await API.get(apiName, path, myInit);
                const fid = response.frame_id;
                navigate(`/frame/${fid}`)
                setLoadingRandom(false)
                // Assuming you want to navigate in a React way, you might not directly manipulate window.location here but instead use this data to inform routing.
            }
        } catch (error) {
            console.error(error);
            setError(error);
            setLoadingRandom(false)
        }
    };

    return { loadRandomFrame, loadingRandom, error };
}

export default useLoadRandomFrame;
