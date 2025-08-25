"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getIdTokenNoParam } from "@/utils"
import { toast } from "sonner"

export default function CreateCommunityPage() {
  const [communityName, setCommunityName] = useState("")
  const [communityDescription, setCommunityDescription] = useState("")
  const [communityType, setCommunityType] = useState("public")
  const [communityTopics, setCommunityTopics] = useState<string[]>([])
  const [customTopic, setCustomTopic] = useState("")
  const [communityRules, setCommunityRules] = useState<string[]>([])
  const [customRule, setCustomRule] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [backgroundPhoto, setBackgroundPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const topics = ["Construction", "Plumbing", "Electrical", "Carpentry", "Welding", "Painting", "Landscaping", "HVAC"]

  const predefinedRules = [
    { id: "rule1", text: "Be respectful to other members" },
    { id: "rule2", text: "No spam or self-promotion" },
    { id: "rule3", text: "Stay on topic" },
    { id: "rule4", text: "No hate speech or harassment" },
  ]

  const toggleTopic = (topic: string) => {
    setCommunityTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]))
  }

  const handleRuleChange = (rule: string, checked: boolean) => {
    setCommunityRules((prev) => (checked ? [...prev, rule] : prev.filter((r) => r !== rule)))
  }

  const handleProfilePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setProfilePhoto(e.target.files[0])
  }

  const handleBackgroundPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setBackgroundPhoto(e.target.files[0])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append("communityName", communityName)
    formData.append("communityDescription", communityDescription)
    formData.append("communityType", communityType)
    formData.append("communityTopics", JSON.stringify(communityTopics))
    formData.append("communityRules", JSON.stringify(communityRules))
    if (profilePhoto) formData.append("communityProfilePhoto", profilePhoto)
    if (backgroundPhoto) formData.append("communityBackgroundPhoto", backgroundPhoto)

    try {
      const idToken = await getIdTokenNoParam()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/community/create-community`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      })

      if (!res.ok) toast.error("Network response was not ok")
      const data = await res.json()

      toast.success("Community created successfully!")
      console.log("Community created:", data)
    } catch (error) {
      toast.error("Failed to create community. Please try again.")
      toast.error("Error creating community")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen md:py-6">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <Link
                href="/community"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back to Community
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">Create a New Community</h1>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="dark:text-gray-200">
                    Community Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter a unique name"
                    className="border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="dark:text-gray-200">
                    Community Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your community"
                    className="border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    value={communityDescription}
                    onChange={(e) => setCommunityDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Community Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {["public", "restricted", "private"].map((type) => (
                      <div
                        key={type}
                        className={`border rounded-lg p-4 hover:border-blue-600 dark:hover:border-blue-400 cursor-pointer ${communityType === type ? "border-blue-600 dark:border-blue-400" : "border-blue-200 dark:border-gray-600"} dark:bg-gray-700`}
                        onClick={() => setCommunityType(type)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={type}
                            name="type"
                            className="text-blue-600 dark:text-blue-400"
                            checked={communityType === type}
                            readOnly
                          />
                          <Label htmlFor={type} className="cursor-pointer capitalize dark:text-gray-200">
                            {type}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Community Topics</Label>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <div
                        key={topic}
                        className={`border rounded-full px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer ${communityTopics.includes(topic) ? "bg-blue-100 dark:bg-blue-900" : "dark:border-gray-600"}`}
                        onClick={() => toggleTopic(topic)}
                      >
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-200">Community Rules</Label>
                  {predefinedRules.map((rule) => (
                    <div key={rule.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={rule.id}
                        className="text-blue-600 dark:text-blue-400"
                        checked={communityRules.includes(rule.text)}
                        onChange={(e) => handleRuleChange(rule.text, e.target.checked)}
                      />
                      <Label htmlFor={rule.id} className="dark:text-gray-200">
                        {rule.text}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePhoto" className="dark:text-gray-200">
                    Community Profile Photo
                  </Label>
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backgroundPhoto" className="dark:text-gray-200">
                    Community Background Photo
                  </Label>
                  <Input
                    id="backgroundPhoto"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundPhotoChange}
                    className="border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                <div className="pt-4 border-t border-blue-100 dark:border-gray-600 flex justify-end gap-4">
                  <Button
                    variant="outline"
                    className="border-blue-200 dark:border-gray-600 dark:text-gray-200 bg-transparent"
                  >
                    <Link href="/community">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Community"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
