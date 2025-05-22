import Header from "@/components/header";
import { Outlet } from "@tanstack/react-router";

export default function CharacterLayout() {
    return (
        <>
            <Outlet />
        </>
    );
}
