import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { Poppins, PT_Sans } from 'next/font/google';
import { FirebaseClientProvider } from "@/firebase/client-provider";

const fontPoppins = Poppins({ 
  subsets: ['latin'], 
  variable: '--font-poppins',
  weight: ['400', '600', '700'] 
});
const fontPtSans = PT_Sans({ 
  subsets: ['latin'], 
  variable: '--font-pt-sans',
  weight: ['400', '700']
});


export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          fontPoppins.variable,
          fontPtSans.variable
        )}
        suppressHydrationWarning={true}
      >
        <FirebaseClientProvider>
          <div>
            {children}
            <Toaster />
          </div>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
