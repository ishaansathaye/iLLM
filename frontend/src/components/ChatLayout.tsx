export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-start">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}