import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import resetImg from "@/assets/images/resetpassword.png";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/reset-password", {
        email,
        newPassword,
      });
      if (res.data.success) {
        setSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(res.data.message || "Password reset failed");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Server error");
      } else {
        setError("Server error");
      }
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
            <div className="relative z-10 flex flex-col items-center text-white text-center">
              <img
                src={resetImg}
                alt="Reset Password"
                className="w-56 h-56 object-contain mb-4"
              />
              <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
              <p className="text-sm text-blue-200 mb-4">Pet Management System</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Secure Password Reset</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Quick & Easy Recovery</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Protect Your Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white p-6 md:p-8 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#002366] mb-1">Reset Password</h2>
              <p className="text-gray-600 text-sm">Enter your email and new password</p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-[#002366] font-semibold mb-1 block text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-[#002366] font-semibold mb-1 block text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
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

              <div>
                <Label htmlFor="confirmPassword" className="text-[#002366] font-semibold mb-1 block text-sm">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="border-2 border-gray-300 focus:border-[#002366] focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 pr-10 transition-all w-full text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#002366] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded text-sm">
                  <p className="text-green-700 text-xs">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-[#002366] to-[#1a4d99] hover:from-[#001a4d] hover:to-[#0f3366] text-white font-semibold py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>

            <div className="mt-6 flex justify-center text-xs">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[#002366] hover:text-[#001a4d] font-semibold transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
