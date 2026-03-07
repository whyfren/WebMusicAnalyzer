// useFile.ts
import { useState } from 'react';

const useFile = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return { file, setFile, handleFile };
};

export default useFile;