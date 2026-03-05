-- Phase 3.4 Exec tool: exec_requests table for approval flow.
-- Run once when you need the Exec tool (ENABLE_EXEC_TOOL=true).
-- Requires: users table exists.

CREATE TABLE IF NOT EXISTS exec_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command VARCHAR(1024) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'running', 'completed', 'failed')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  output TEXT,
  error TEXT,
  exit_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_exec_requests_status ON exec_requests(status);
CREATE INDEX IF NOT EXISTS idx_exec_requests_requested_by ON exec_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_exec_requests_created ON exec_requests(created_at DESC);

COMMENT ON TABLE exec_requests IS 'Exec tool: pending and completed command requests. Approval flow when EXEC_REQUIRE_APPROVAL=true.';
