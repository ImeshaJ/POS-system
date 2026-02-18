import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import registerImg from "@/assets/images/register.png";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/auth/register", {
        email,
        username,
        password,
        role,
      });
      navigate("/login");
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
          <div className="hidden md:flex items-center justify-center bg-linear-to-br from-[#002366] to-[#0d1f47] p-6 relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-white text-center">
              <img
                src={registerImg}
                alt="Register"
                className="w-48 h-48 object-contain mb-3"
              />
              <h1 className="text-2xl font-bold mb-1">Join Us</h1>
              <p className="text-xs text-blue-200 mb-3">Management System</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Easy Pet Records</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Real-time Inventory</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Secure & Fast</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white p-3 md:p-4 flex flex-col justify-center">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-[#002366] mb-0.5">Create Account</h2>
              <p className="text-gray-600 text-xs">Sign up to get started</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-2">
              <div className="flex gap-1 mb-2">
                <Button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all text-xs ${
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
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all text-xs ${
                    role === 'staff'
                      ? 'bg-linear-to-r from-[#002366] to-[#1a4d99] text-white'
                      : 'bg-white border-2 border-gray-300 text-[#002366] hover:border-[#002366]'
                  }`}
                >
                  Staff
                </Button>
              </div>

              <div>
                <Label htmlFor="email" className="text-[#002366] font-semibold mb-0.5 block text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 transition-all text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="username" className="text-[#002366] font-semibold mb-0.5 block text-xs">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 transition-all text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-[#002366] font-semibold mb-0.5 block text-xs">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 pr-7 transition-all w-full text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#002366] transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-[#002366] font-semibold mb-0.5 block text-xs">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 pr-7 transition-all w-full text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#002366] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-1.5 rounded text-xs">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-[#002366] to-[#1a4d99] hover:from-[#001a4d] hover:to-[#0f3366] text-white font-semibold py-1 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-3 flex justify-center text-xs">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[#002366] hover:text-[#001a4d] font-semibold transition-colors"
              >
                Have account? Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
