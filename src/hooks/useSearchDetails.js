import { useContext } from "react";
import { SearchContext } from "../contexts/SearchContext";


const useSearchDetails = () => {
    const context = useContext(SearchContext);
    
    if (!context) {
      throw new Error('useSearchDetails must be used within a SearchDetailsProvider');
    }
    
    console.log(context)
    return context;
  };
  
  export default useSearchDetails;