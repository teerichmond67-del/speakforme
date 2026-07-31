' Double-click launcher for SpeakForMe on Windows.
' Runs the Electron app directly (no console window), so this file
' can be shortcut-ed to the Desktop or Start Menu for one-click launch.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
  MsgBox "SpeakForMe isn't set up yet." & vbCrLf & vbCrLf & _
    "Open Command Prompt in this folder and run 'npm install' first, then try again.", _
    vbExclamation, "SpeakForMe"
  WScript.Quit
End If

shell.CurrentDirectory = appDir
shell.Run """" & electronExe & """ .", 0, False
