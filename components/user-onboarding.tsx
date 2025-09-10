"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthAPI } from "@/lib/api"
import { UserRole } from "@/lib/types/database"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface OnboardingProps {
  onComplete: (user: any) => void
  onCancel: () => void
}

export default function UserOnboarding({ onComplete, onCancel }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "client" as UserRole,
    agreeToTerms: false,
    agreeToPrivacy: false
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
  }

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields")
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }
    
    return true
  }

  const validateStep2 = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError("Please fill in all fields")
      return false
    }
    
    return true
  }

  const validateStep3 = () => {
    if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
      setError("Please agree to the terms and privacy policy")
      return false
    }
    
    return true
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    
    setStep(prev => prev + 1)
  }

  const handleSubmit = async () => {
    if (!validateStep3()) return
    
    setLoading(true)
    setError("")
    
    try {
      const result = await AuthAPI.signUp(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: formData.role
        }
      )
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      setSuccess("Account created successfully! Please check your email for verification.")
      
      // Wait a moment then complete onboarding
      setTimeout(() => {
        onComplete(result.data)
      }, 2000)
      
    } catch (error) {
      setError("Failed to create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          placeholder="Enter your email address"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
          placeholder="Create a strong password"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
          placeholder="Confirm your password"
          required
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            placeholder="Enter your first name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            placeholder="Enter your last name"
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          placeholder="Enter your phone number"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="role">Account Type</Label>
        <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Client - Book protection services</SelectItem>
            <SelectItem value="agent">Agent - Provide protection services</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm">
            I agree to the{" "}
            <a href="/terms" className="text-blue-400 hover:underline" target="_blank">
              Terms of Service
            </a>
          </Label>
        </div>
        
        <div className="flex items-start space-x-2">
          <Checkbox
            id="privacy"
            checked={formData.agreeToPrivacy}
            onCheckedChange={(checked) => handleInputChange("agreeToPrivacy", checked as boolean)}
          />
          <Label htmlFor="privacy" className="text-sm">
            I agree to the{" "}
            <a href="/privacy" className="text-blue-400 hover:underline" target="_blank">
              Privacy Policy
            </a>
          </Label>
        </div>
      </div>
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Important:</p>
            <p>After creating your account, you'll receive an email verification link. Please check your inbox and click the link to activate your account.</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
      <h3 className="text-xl font-semibold text-white">Account Created Successfully!</h3>
      <p className="text-gray-300">
        We've sent a verification email to <strong>{formData.email}</strong>
      </p>
      <p className="text-sm text-gray-400">
        Please check your inbox and click the verification link to activate your account.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center">
            {step === 4 ? "Welcome to Protector.Ng" : "Create Your Account"}
          </CardTitle>
          <CardDescription className="text-gray-300 text-center">
            {step === 4 ? "Account created successfully" : `Step ${step} of 3`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-200 text-sm">{success}</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            {step > 1 && step < 4 && (
              <Button
                onClick={() => setStep(prev => prev - 1)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Previous
              </Button>
            )}
            
            {step < 3 && (
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
              >
                Next
              </Button>
            )}
            
            {step === 3 && (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            )}
            
            {step === 4 && (
              <Button
                onClick={onCancel}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                Continue to App
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


