"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Building2,
  MapPin,
  Briefcase,
  Banknote,
  Calendar,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
  Users,
  Edit,
  Trash2,
  Filter,
  Eye,
  Phone,
  Mail,
  User,
  FileText,
  Download,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getCurrentUser, getIdTokenNoParam } from "@/utils"
import { useGoogleTranslate } from "@/context/googleTranslateContext"

interface JobLocation {
  city?: string
  state?: string
  district?: string
  pincode?: string
}

interface Job {
  id: string
  employer_id: string
  job_title: string
  type_of_work: string
  employer_name?: string
  place_of_work?: string
  location?: JobLocation
  vacancies?: number
  special_woman_provision?: boolean
  special_transgender_provision?: boolean
  special_disability_provision?: boolean
  wage?: string
  hours_per_week?: number
  job_duration?: string
  start_time?: string
  end_time?: string
  job_role_description?: string
  createdAt?: string
  updatedAt?: string
}

interface Worker {
  applicationId: string
  status: "pending" | "accepted" | "rejected"
  appliedAt: {
    _seconds: number
    _nanoseconds: number
  }
  firstName?: string
  lastName?: string
  middleName?: string
  phoneNumber?: string
  emailAddress?: string
  residentialAddress?: string
  profession?: string
  gender?: string
  summary?: string
  profilePhoto?: string
  resume?: string
  createdAt?: {
    _seconds: number
    _nanoseconds: number
  }
  updatedAt?: {
    _seconds: number
    _nanoseconds: number
  }
  // Legacy fields for backward compatibility
  is_woman?: boolean
  is_lgbtq?: boolean
  is_disabled?: boolean
}

const timestampToDate = (timestamp: { _seconds: number; _nanoseconds: number } | string): Date => {
  if (typeof timestamp === "string") {
    return new Date(timestamp)
  }
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000)
}

const WorkerDetailsModal = ({
  worker,
  onStatusChange,
}: {
  worker: Worker
  onStatusChange: (applicationId: string, status: "accepted" | "rejected" | "pending") => void
}) => {
  const fullName = [worker.firstName, worker.middleName, worker.lastName].filter(Boolean).join(" ")
  const appliedDate = timestampToDate(worker.appliedAt)
  const createdDate = worker.createdAt ? timestampToDate(worker.createdAt) : null
  const updatedDate = worker.updatedAt ? timestampToDate(worker.updatedAt) : null

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={worker.profilePhoto || "/placeholder.svg"} alt={fullName} />
            <AvatarFallback>
              {worker.firstName?.[0]}
              {worker.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{fullName || "Anonymous Worker"}</h2>
            <Badge
              variant={
                worker.status === "accepted" ? "default" : worker.status === "rejected" ? "destructive" : "secondary"
              }
            >
              {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
            </Badge>
          </div>
        </DialogTitle>
        <DialogDescription>
          Applied on {appliedDate.toLocaleDateString()} at {appliedDate.toLocaleTimeString()}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {worker.emailAddress && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{worker.emailAddress}</span>
              </div>
            )}
            {worker.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{worker.phoneNumber}</span>
              </div>
            )}
            {worker.residentialAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{worker.residentialAddress}</span>
              </div>
            )}
            {worker.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{worker.gender}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Professional Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Professional Information
          </h3>
          <div className="space-y-2">
            {worker.profession && (
              <div>
                <span className="text-sm font-medium">Profession: </span>
                <span className="text-sm">{worker.profession}</span>
              </div>
            )}
            {worker.summary && (
              <div>
                <span className="text-sm font-medium">Summary: </span>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">{worker.summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        {worker.resume && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="flex items-center gap-2 bg-transparent">
                  <a href={worker.resume} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    View Resume
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Timeline */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Applied:</span>
              <span>{appliedDate.toLocaleString()}</span>
            </div>
            {createdDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Created:</span>
                <span>{createdDate.toLocaleString()}</span>
              </div>
            )}
            {updatedDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{updatedDate.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {worker.status === "pending" && (
          <>
            <Separator />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => onStatusChange(worker.applicationId, "accepted")}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Application
              </Button>
              <Button variant="destructive" onClick={() => onStatusChange(worker.applicationId, "rejected")}>
                Reject Application
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogContent>
  )
}

export default function EmployerPostsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [workersLoading, setWorkersLoading] = useState(false)
  const [requestFilters, setRequestFilters] = useState({
    women: false,
    lgbtq: false,
    disabled: false,
    status: "all",
  })

  const { isActive: isTranslateActive } = useGoogleTranslate()

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const idToken = await getIdTokenNoParam()
      const user = await getCurrentUser()
      const userId = user?.uid
      console.log(userId)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/all?employer_id=${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }

      const data = await response.json()
      setJobs(data.jobPosts || [])
      setFilteredJobs(data.jobPosts || [])
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast.error("Failed to fetch job posts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkers = async (jobId: string) => {
    try {
      setWorkersLoading(true)
      const idToken = await getIdTokenNoParam()
      const user = await getCurrentUser()
      const userId = user?.uid
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/workers/${jobId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch workers")
      }

      const data = await response.json()
      setWorkers(data.workers || [])
    } catch (error) {
      console.error("Error fetching workers:", error)
      toast.error("Failed to fetch worker applications. Please try again.")
    } finally {
      setWorkersLoading(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      const idToken = await getIdTokenNoParam()
      const user = await getCurrentUser()
      const userId = user?.uid

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/delete/${jobId}?employer_id=${userId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to delete job")
      }

      // Remove job from local state
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
      setFilteredJobs((prev) => prev.filter((job) => job.id !== jobId))

      toast.success("Job post deleted successfully.")
    } catch (error) {
      console.error("Error deleting job:", error)
      toast.error("Failed to delete job post. Please try again")
    }
  }

  const handleStatusChange = async (applicationId: string, newStatus: "accepted" | "rejected" | "pending") => {
    try {
      const formData = new FormData()
      formData.append("applicationId", applicationId)
      formData.append("status", newStatus)
      const idToken = await getIdTokenNoParam()
      const user = await getCurrentUser()
      const userId = user?.uid
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/update-application`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to update application status")
      }

      // Update local state
      setWorkers((prev) =>
        prev.map((worker) => (worker.applicationId === applicationId ? { ...worker, status: newStatus } : worker)),
      )

      toast.success(`Application ${newStatus} successfully.`)
    } catch (error) {
      console.error("Error updating application status:", error)
      toast.error("Failed to update application status. Please try again.")
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (selectedJobId) {
      fetchWorkers(selectedJobId)
    }
  }, [selectedJobId])

  // Filter jobs based on search term and filter type
  useEffect(() => {
    let result = [...jobs]

    if (!isTranslateActive) {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        result = result.filter(
          (job) => job.job_title?.toLowerCase().includes(term) || job.place_of_work?.toLowerCase().includes(term),
        )
      }

      if (filterType && filterType !== "all") {
        result = result.filter((job) => job.type_of_work === filterType)
      }
    }

    setFilteredJobs(result)
  }, [searchTerm, filterType, jobs, isTranslateActive])

  const getFilteredWorkers = () => {
    let filtered = [...workers]

    if (requestFilters.women) {
      filtered = filtered.filter((worker) => worker.is_woman || worker.gender === "female")
    }

    if (requestFilters.lgbtq) {
      filtered = filtered.filter((worker) => worker.is_lgbtq)
    }

    if (requestFilters.disabled) {
      filtered = filtered.filter((worker) => worker.is_disabled)
    }

    // Apply status filter
    if (requestFilters.status !== "all") {
      filtered = filtered.filter((worker) => worker.status === requestFilters.status)
    }

    return filtered
  }

  // Get job title by ID
  const getJobTitle = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    return job ? job.job_title : "Unknown Job"
  }

  const getWorkerCount = (jobId: string) => {
    return workers.filter((worker) => selectedJobId === jobId).length
  }

  // Clear all filters
  const clearFilters = () => {
    if (isTranslateActive) return
    setSearchTerm("")
    setFilterType(null)
  }

  // Reset request filters
  const resetRequestFilters = () => {
    if (isTranslateActive) return
    setRequestFilters({
      women: false,
      lgbtq: false,
      disabled: false,
      status: "all",
    })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {isTranslateActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Google Translate is active. Tab switching and filtering features are disabled to prevent issues. For the
                best experience, please disable translation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Employer Dashboard</h1>
        <p className="text-muted-foreground">Manage your job posts and worker applications</p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="posts" className="flex items-center gap-2" disabled={isTranslateActive}>
            <Briefcase className="h-4 w-4" />
            <span>My Job Posts</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2" disabled={isTranslateActive}>
            <Users className="h-4 w-4" />
            <span>Worker Requests</span>
          </TabsTrigger>
        </TabsList>

        {/* Job Posts Tab */}
        <TabsContent value="posts">
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search job posts by title or location..."
                  className="pl-10 border-blue-200 focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => !isTranslateActive && setSearchTerm(e.target.value)}
                  disabled={isTranslateActive}
                />
                {searchTerm && !isTranslateActive && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={filterType || "all"}
                  onValueChange={(value) => !isTranslateActive && setFilterType(value)}
                  disabled={isTranslateActive}
                >
                  <SelectTrigger className="border-blue-200 focus-visible:ring-blue-500">
                    <div className="flex items-center">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Job Type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent"
                asChild
                disabled={isTranslateActive}
              >
                <Link href="/">
                  <span>Post New Job</span>
                </Link>
              </Button>

              {(searchTerm || (filterType && filterType !== "all")) && !isTranslateActive && (
                <Button
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className={`overflow-hidden transition-all hover:shadow-md ${
                    job.special_woman_provision
                      ? "border-l-4 border-l-pink-500"
                      : job.special_transgender_provision
                        ? "border-l-4 border-l-purple-500"
                        : ""
                  }`}
                >
                  <CardHeader className="pb-2 relative">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg sm:text-xl pr-16">{job.job_title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 h-8 w-8"
                            disabled={isTranslateActive}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}?edit=${job.id}`}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Post</span>
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Post</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Job Post</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{job.job_title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{job.employer_name || "Your Company"}</span>
                    </div>
                    <div className="absolute top-12 right-4 flex flex-col sm:flex-row gap-1">
                      {job.special_woman_provision && (
                        <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300">
                          Women
                        </Badge>
                      )}
                      {job.special_transgender_provision && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                          LGBTQ+
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {job.place_of_work ||
                            (job.location
                              ? `${job.location.city || ""} ${job.location.state || ""}`.trim()
                              : "Location not provided")}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Briefcase className="h-4 w-4 mr-1 flex-shrink-0" />
                        <Badge variant="outline" className="font-normal rounded-sm">
                          {job.type_of_work}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <Banknote className="h-4 w-4 mr-1 flex-shrink-0" />
                        {job.wage || "Salary not provided"}
                      </div>
                      {job.createdAt && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-600">
                          <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span>View applications</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 -mr-2"
                          disabled={isTranslateActive}
                          onClick={() => {
                            setSelectedJobId(job.id)
                            const requestsTab = document.querySelector(
                              '[data-state="inactive"][value="requests"]',
                            ) as HTMLElement
                            if (requestsTab) {
                              requestsTab.click()
                            }
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Link href={`/job/${job.id}`} className="w-full">
                      <Button variant="outline" className="w-full hover:bg-blue-50 bg-transparent">
                        <span>View Details</span>
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-medium text-blue-800 mb-2">No job posts found</h3>
              <p className="text-blue-600 mb-6">
                {jobs.length === 0 ? "You haven't posted any jobs yet." : "No jobs match your current filters."}
              </p>
              {jobs.length === 0 ? (
                <Button className="bg-blue-600 hover:bg-blue-700" asChild disabled={isTranslateActive}>
                  <Link href="/job-post-form">Post Your First Job</Link>
                </Button>
              ) : (
                !isTranslateActive && (
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-100 bg-transparent"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )
              )}
            </div>
          )}
        </TabsContent>

        {/* Worker Requests Tab */}
        <TabsContent value="requests" id="requests-tab">
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Job filter */}
              <div className="w-full sm:w-64">
                <Select
                  value={selectedJobId || "all"}
                  onValueChange={(value) => !isTranslateActive && setSelectedJobId(value === "all" ? null : value)}
                  disabled={isTranslateActive}
                >
                  <SelectTrigger className="border-blue-200 focus-visible:ring-blue-500">
                    <div className="flex items-center">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by Job" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="w-full sm:w-48">
                <Select
                  value={requestFilters.status}
                  onValueChange={(value: any) =>
                    !isTranslateActive && setRequestFilters({ ...requestFilters, status: value })
                  }
                  disabled={isTranslateActive}
                >
                  <SelectTrigger className="border-blue-200 focus-visible:ring-blue-500">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {workersLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredWorkers().length > 0 ? (
                getFilteredWorkers().map((worker) => {
                  const fullName = [worker.firstName, worker.middleName, worker.lastName].filter(Boolean).join(" ")
                  const appliedDate = timestampToDate(worker.appliedAt)

                  return (
                    <Card key={worker.applicationId} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={worker.profilePhoto || "/placeholder.svg"} alt={fullName} />
                            <AvatarFallback>
                              {worker.firstName?.[0]}
                              {worker.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{fullName || "Anonymous Worker"}</h3>
                              <div className="flex gap-1">
                                {(worker.is_woman || worker.gender === "female") && (
                                  <Badge className="bg-pink-100 text-pink-700 text-xs">Women</Badge>
                                )}
                                {worker.is_lgbtq && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">LGBTQ+</Badge>
                                )}
                                {worker.is_disabled && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">Disabled</Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground">
                              {worker.emailAddress && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  <span>{worker.emailAddress}</span>
                                </div>
                              )}
                              {worker.phoneNumber && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{worker.phoneNumber}</span>
                                </div>
                              )}
                              {worker.profession && (
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-3 w-3" />
                                  <span>{worker.profession}</span>
                                </div>
                              )}
                              {worker.residentialAddress && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{worker.residentialAddress}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Applied {appliedDate.toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <Badge
                            variant={
                              worker.status === "accepted"
                                ? "default"
                                : worker.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="mb-2 sm:mb-0"
                          >
                            {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
                          </Badge>

                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="flex items-center gap-2 bg-transparent">
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <WorkerDetailsModal worker={worker} onStatusChange={handleStatusChange} />
                            </Dialog>

                            {worker.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(worker.applicationId, "accepted")}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={isTranslateActive}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusChange(worker.applicationId, "rejected")}
                                  disabled={isTranslateActive}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-medium text-blue-800 mb-2">No worker requests found</h3>
                  <p className="text-blue-600 mb-6">
                    {!selectedJobId
                      ? "Select a job to view applications."
                      : workers.length === 0
                        ? "No applications received for this job yet."
                        : "No applications match your current filters."}
                  </p>
                  {workers.length > 0 && !isTranslateActive && (
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-100 bg-transparent"
                      onClick={resetRequestFilters}
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
