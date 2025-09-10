"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Home, Search, User, Plus, Heart, MessageCircle, Share } from "lucide-react"

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState("home")

  return (
    <div className="max-w-sm mx-auto bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">MyApp</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>SA</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm">Sarah Anderson</CardTitle>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-3">
                  Just finished an amazing hike! The view from the top was absolutely breathtaking 🏔️
                </p>
                <img
                  src="/placeholder.svg?height=200&width=300"
                  alt="Mountain view"
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Heart className="h-4 w-4 mr-1" />
                      <span className="text-xs">24</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">8</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Adventure
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>MJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm">Mike Johnson</CardTitle>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-3">Working on a new project! Excited to share the progress soon 🚀</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Heart className="h-4 w-4 mr-1" />
                      <span className="text-xs">12</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">3</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="p-0 h-auto">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Tech
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "search" && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <img
                      src={`/placeholder.svg?height=120&width=160&query=photo ${i}`}
                      alt={`Photo ${i}`}
                      className="w-full h-24 object-cover rounded-t-lg"
                    />
                    <div className="p-2">
                      <p className="text-xs font-medium">Photo {i}</p>
                      <p className="text-xs text-muted-foreground">User {i}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="p-4 space-y-6">
            <div className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src="/placeholder.svg?height=96&width=96" />
                <AvatarFallback className="text-2xl">JD</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">John Doe</h2>
              <p className="text-muted-foreground">@johndoe</p>
              <p className="text-sm mt-2">Passionate about technology, travel, and photography 📸</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">127</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">1.2K</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">892</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
            </div>

            <Button className="w-full">Edit Profile</Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="border-t bg-background">
        <div className="flex items-center justify-around p-2">
          <Button
            variant={activeTab === "home" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("home")}
            className="flex-col h-12 px-3"
          >
            <Home className="h-4 w-4" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          <Button
            variant={activeTab === "search" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("search")}
            className="flex-col h-12 px-3"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs mt-1">Search</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-12 px-3">
            <Plus className="h-4 w-4" />
            <span className="text-xs mt-1">Create</span>
          </Button>
          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("profile")}
            className="flex-col h-12 px-3"
          >
            <User className="h-4 w-4" />
            <span className="text-xs mt-1">Profile</span>
          </Button>
        </div>
      </nav>
    </div>
  )
}
