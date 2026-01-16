import { createContext, useContext } from "react";

interface SidebarContextProps {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

function useSidebarContext() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebarContext must be used within a SidebarContext.Provider.");
    }
    return context;
}

export { SidebarContext, useSidebarContext, type SidebarContextProps };
