import { useState } from "react";

export const useProgress = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'done