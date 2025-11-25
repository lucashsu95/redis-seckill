"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface VerificationCheck {
  name: string
  passed: boolean
  details: string
  expected?: number
  actual?: number
}

interface VerificationResult {
  success: boolean
  timestamp: string
  checks: VerificationCheck[]
  summary: {
    totalOrders: number
    totalLeaderboardSales: number
    productsChecked: number
  }
}

export function VerifyButton() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<VerificationResult | null>(null)

  const handleVerify = async () => {
    setIsVerifying(true)

    try {
      const response = await fetch("/api/admin/verify")
      const data = await response.json()

      setResults(data)
      setShowResults(true)

      if (data.success) {
        toast.success("All checks passed! System is consistent.")
      } else {
        toast.error("Verification failed. Check the details.")
      }
    } catch (error) {
      toast.error("Failed to run verification")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <Button onClick={handleVerify} disabled={isVerifying} variant="outline" size="sm">
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verify Data
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {results?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Data Consistency Verification
            </DialogTitle>
            <DialogDescription>
              {results?.timestamp && (
                <span className="text-xs">Completed at {new Date(results.timestamp).toLocaleString()}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                  <div className="text-2xl font-bold">{results.summary.totalOrders}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Leaderboard Sales</div>
                  <div className="text-2xl font-bold">{results.summary.totalLeaderboardSales}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Products Checked</div>
                  <div className="text-2xl font-bold">{results.summary.productsChecked}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Verification Checks</h3>
                {results.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      check.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {check.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium text-sm">{check.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{check.details}</p>
                        {(check.expected !== undefined || check.actual !== undefined) && (
                          <div className="mt-1 flex gap-4 text-xs">
                            {check.expected !== undefined && <span>Expected: {check.expected}</span>}
                            {check.actual !== undefined && <span>Actual: {check.actual}</span>}
                          </div>
                        )}
                      </div>
                      <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? "PASS" : "FAIL"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
