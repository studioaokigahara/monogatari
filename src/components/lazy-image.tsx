import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps extends React.HTMLAttributes<HTMLImageElement> {
    imageURL: string;
    alt?: string;
    size: string;
    className?: string;
}

export default function LazyImage({
    imageURL,
    alt,
    size,
    className,
    ...props
}: LazyImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
    }, [imageURL]);

    return (
        <>
            {imageURL && (
                <img
                    src={imageURL}
                    alt={alt || ""}
                    className={cn(imageLoaded ? size : "hidden", className)}
                    onLoad={() => setImageLoaded(true)}
                    {...props}
                />
            )}
            {(!imageURL || !imageLoaded) && (
                <Skeleton
                    className={cn("shrink-0 cursor-none", size, className)}
                />
            )}
        </>
    );
}
