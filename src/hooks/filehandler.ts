// this is a hook for handling file components
import { useState } from 'react';
import { analyzeAudio } from "../analysis/index";


const useFile = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };


  return { file, setFile, handleFile };
};

const processFile = (file: File | null) => {
  if (!file) return;

  analyzeAudio(file);
};

export default useFile;