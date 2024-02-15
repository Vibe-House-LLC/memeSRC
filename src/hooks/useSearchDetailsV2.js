import { useContext } from "react";
import { V2SearchContext } from "../contexts/v2-search-context";


const useSearchDetailsV2 = () => {
    const context = useContext(V2SearchContext);
    
    if (!context) {
      throw new Error('useSearchDetailsV2 must be used within a V2SearchDetailsProvider');
    }
    
    // console.log(context)
    return context;
  };
  
  export default useSearchDetailsV2;