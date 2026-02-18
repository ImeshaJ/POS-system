
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/lib/authContext";
import { apiPost } from "@/lib/api";
import loginImg from "@/assets/images/login.png";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [role, setRole] = useState<'admin' | 'staff'>('admin');
  const { setAuth } = useContext(AuthContext);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      setError("Please fill all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ user: { id: number; email: string; username: string; role: "admin" | "staff" }; token: string }>("/api/auth/login", {
        identifier: loginIdentifier,
        password,
        role,
      });
      // API returns {success, user, token} directly, not wrapped in data
      const response = res as unknown as { success: boolean; user: { id: number; email: string; username: string; role: "admin" | "staff" }; token: string };
      setAuth(response.user, response.token);
      const userRole = response.user?.role ?? role;
      if (userRole === 'admin') navigate("/dashboard");
      else navigate("/sales/new");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Server error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#002366] via-[#1a4d99] to-[#0d1f47]">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          {/* Left Side - Image */}
          <div className="hidden md:flex items-center justify-center bg-linear-to-br from-[#002366] to-[#0d1f47] p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center text-white text-center">
              <img
                src={loginImg}
                alt="src/assets/images/login.png"
                className="w-56 h-56 object-contain mb-4 drop-shadow-2xl animate-pulse"
              />
              <h1 className="text-3xl font-bold mb-2">Furry Friends</h1>
              <p className="text-sm text-blue-200 mb-4">Pet Management System</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Easy Pet Records Management</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Real-time Inventory Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Secure & Fast Operations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#002366] mb-1">Welcome Back</h2>
              <p className="text-gray-600 text-sm">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${
                    role === 'admin'
                      ? 'bg-linear-to-r from-[#002366] to-[#1a4d99] text-white'
                      : 'bg-white border-2 border-gray-300 text-[#002366] hover:border-[#002366]'
                  }`}
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all text-sm ${
                    role === 'staff'
                      ? 'bg-linear-to-r from-[#002366] to-[#1a4d99] text-white'
                      : 'bg-white border-2 border-gray-300 text-[#002366] hover:border-[#002366]'
                  }`}
                >
                  Staff
                </Button>
              </div>
              <div>
                <Label htmlFor="identifier" className="text-[#002366] font-semibold mb-1 block text-sm">
                  Email Address or Username
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Enter email or username"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-[#002366] font-semibold mb-1 block text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 pr-10 transition-all w-full text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#002366] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-[#002366] to-[#1a4d99] hover:from-[#001a4d] hover:to-[#0f3366] text-white font-semibold py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 flex justify-between text-xs">
              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-[#002366] hover:text-[#001a4d] font-semibold transition-colors"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-[#002366] hover:text-[#001a4d] font-semibold transition-colors"
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
