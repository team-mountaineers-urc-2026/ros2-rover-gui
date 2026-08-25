import { createContext, useContext, useState } from 'react';

export const AmpContext = createContext();

export const AmpProvider = ({ children }) => {
    const [totalAmps, setTotalAmps] = useState(0);
    const [ahUsed, setAhUsed]       = useState(0);
    const [totalAh, setTotalAh]     = useState(8.0);

    return (
        <AmpContext.Provider value={{ totalAmps, setTotalAmps, ahUsed, setAhUsed, totalAh, setTotalAh }}>
            {children}
        </AmpContext.Provider>
    );
};

export const useAmps = () => useContext(AmpContext);