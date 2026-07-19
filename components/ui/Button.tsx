type ButtonProps = {
  children: React.ReactNode;
};

export default function Button({ children }: ButtonProps) {
  return (
    <button className="rounded-xl bg-indigo-500 px-7 py-4 font-semibold text-white transition hover:bg-indigo-400">
      {children}
    </button>
  );
}