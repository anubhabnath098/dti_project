"use client"

import { useEffect, useRef, useState } from "react"
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
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { JobPost } from "@/types/jobpost"
import { getCurrentUser, getIdTokenNoParam } from "@/utils"
import { useGoogleTranslate } from "@/context/googleTranslateContext"

interface JobLocation {
  city?: string
  state?: string
  district?: string
  pincode?: string
}

export default function AppliedJobs() {
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([])

    const lastFilteredJobsRef = useRef<any[]>([])

  const { isActive: isTranslateActive } = useGoogleTranslate()

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      try {
        setLoading(true)
        setError(null)
        const idToken = await getIdTokenNoParam()
        const user = await getCurrentUser()
        const userId = user?.uid
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/applied-jobs/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch applied jobs: ${response.statusText}`)
        }

        console.log("Response from applied jobs:", response)
        const appliedJobs: JobPost[] = (await response.json()).jobs

        setJobs(appliedJobs)
        setFilteredJobs(appliedJobs)
      } catch (error) {
        console.error("Error fetching applied jobs:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch applied jobs")
      } finally {
        setLoading(false)
      }
    }

    fetchAppliedJobs()
  }, [])

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

      lastFilteredJobsRef.current = result
    } else {
      result = lastFilteredJobsRef.current
    }

    setFilteredJobs(result)
  }, [searchTerm, filterType, jobs, isTranslateActive])

  const clearFilters = () => {
    if (isTranslateActive) return
    setSearchTerm("")
    setFilterType(null)
  }

  const retryFetch = () => {
    const fetchAppliedJobs = async () => {
      try {
        setLoading(true)
        setError(null)

        const idToken = await getIdTokenNoParam()
        const user = await getCurrentUser()
        const userId = user?.uid
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/applied-jobs/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch applied jobs: ${response.statusText}`)
        }

        const appliedJobs: JobPost[] = (await response.json()).jobs
        setJobs(appliedJobs)
        setFilteredJobs(appliedJobs)
      } catch (error) {
        console.error("Error fetching applied jobs:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch applied jobs")
      } finally {
        setLoading(false)
      }
    }

    fetchAppliedJobs()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading your applied jobs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={retryFetch}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
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
                Google Translate is active. Filtering features are disabled to prevent issues. For the best experience,
                please disable translation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2 dark:text-blue-500">Applied Jobs</h1>
        <p className="text-muted-foreground">View and manage all the jobs you've applied for</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, company or location..."
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
              value={filterType || ""}
              onValueChange={(value) => !isTranslateActive && setFilterType(value || null)}
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

          {(searchTerm || filterType) && !isTranslateActive && (
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
              className={`overflow-hidden transition-all hover:shadow-md group ${
                job.special_woman_provision
                  ? "border-l-4 border-l-pink-500"
                  : job.special_transgender_provision
                    ? "border-l-4 border-l-purple-500"
                    : job.special_disability_provision
                      ? "border-l-4 border-l-blue-500"
                      : ""
              }`}
            >
              <CardHeader className="pb-2 relative">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg sm:text-xl pr-16 group-hover:text-primary transition-colors">
                    {job.job_title}
                  </CardTitle>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{job.employer_name || "Unknown Employer"}</span>
                </div>
                <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-1">
                  {(job as any).applicationStatus && (
                    <Badge
                      className={
                        (job as any).applicationStatus === "accepted"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : (job as any).applicationStatus === "rejected"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }
                    >
                      {(job as any).applicationStatus}
                    </Badge>
                  )}
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
                  {job.special_disability_provision && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                      Disabled
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
                  {(job as any).appliedAt && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                      Applied {new Date((job as any).appliedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Link href={`/job/${job.id}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors bg-transparent"
                  >
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
          <h3 className="text-xl font-medium text-blue-800 mb-2">No jobs found</h3>
          <p className="text-blue-600 mb-6">
            {jobs.length === 0 ? "You haven't applied to any jobs yet." : "No jobs match your current filters."}
          </p>
          {jobs.length > 0 && !isTranslateActive && (
            <Button
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-100 bg-transparent"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
