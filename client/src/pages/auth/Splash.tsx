import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/images/loading.png";

export default function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 40 : prev));
    }, 300);

    const timer = setTimeout(() => {
      setProgress(100);
      navigate("/login");
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#002366] via-[#1a4d99] to-[#0d1f47] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

      <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
        {/* Logo Container with glow effect */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-linear-to-r from-green-400 to-blue-400 rounded-full blur-lg opacity-0 group-hover:opacity-75 transition duration-1000 animate-pulse"></div>
          <div className="w-56 h-56 bg-white rounded-full flex items-center justify-center shadow-2xl relative">
            <img
              src={logoImg}
              alt="Furry Friends Logo"
              className="w-44 h-44 object-contain relative z-10"
            />
          </div>
        </div>

        {/* Brand Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg tracking-tight">
            Furry Friends
          </h1>
          <p className="text-base text-blue-100 font-light tracking-wide">
            Pet Management System
          </p>
        </div>

        {/* Professional Loading Bar */}
        <div className="w-48 space-y-2 mt-4">
          <div className="w-full h-1.5 bg-blue-900 rounded-full overflow-hidden shadow-lg">
            <div
              className="h-full bg-linear-to-r from-green-400 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-blue-200 text-xs font-medium">{Math.round(progress)}%</p>
        </div>

        {/* Status Messages */}
        <div className="text-center space-y-1 mt-2">
          <p className="text-blue-200 text-sm font-semibold">
            {progress < 33 ? "Initializing..." : progress < 66 ? "Loading resources..." : "Ready to begin"}
          </p>
          <p className="text-blue-300 text-xs">Enterprise Management Solution</p>
        </div>
      </div>
    </div>
  );
}
