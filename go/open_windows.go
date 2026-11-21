//go:build windows

package main

import (
	"syscall"
	"unsafe"
)

// shell32.dll is one of Windows' known DLLs, so it always loads from the system folder.
var shellExecute = syscall.NewLazyDLL("shell32.dll").NewProc("ShellExecuteW")

// openBrowser opens the DM page in the default browser through the Windows shell (ShellExecute, the call
// Explorer itself makes), not through rundll32, which antivirus heuristics treat as suspicious.
func openBrowser(url string) {
	verb, err := syscall.UTF16PtrFromString("open")
	if err != nil {
		return
	}
	file, err := syscall.UTF16PtrFromString(url)
	if err != nil {
		return
	}
	const swShowNormal = 1
	shellExecute.Call(0, uintptr(unsafe.Pointer(verb)), uintptr(unsafe.Pointer(file)), 0, 0, swShowNormal)
}
