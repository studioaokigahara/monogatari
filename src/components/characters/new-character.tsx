import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export default function NewCharacter() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus />
                    New Character
                </Button>
            </DialogTrigger>
            <DialogContent>
                <h2 className="text-xl font-bold mb-4">
                    Create a new character
                </h2>
                <div className="grid gap-4">
                    <Button
                        variant="default"
                        onClick={() => {
                            /* show guided flow or stub */
                        }}
                    >
                        Guided AI Creation (Coming soon!)
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            /* show guided flow or stub */
                        }}
                    >
                        Start from Scratch
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
