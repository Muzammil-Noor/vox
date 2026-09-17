; Inno Setup script for the Vox installer. package.bat compiles it and passes
; the version in:   ISCC /DAppVersion=0.1.0 installer\vox.iss
;
; It ships the app image that jpackage wrote to ..\dist\vox (the vox.exe
; launcher plus a trimmed Java runtime, so nothing else needs installing)
; and, when the task is ticked, puts that folder on the PATH.
;
; Installs per user by default (no admin prompt; lands in
; %LOCALAPPDATA%\Programs\Vox). The first dialog lets the user pick a
; machine-wide install into Program Files instead.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{ADD6F618-9B61-43B3-B3AA-EE3405D0F8F3}
AppName=Vox
AppVersion={#AppVersion}
AppVerName=Vox {#AppVersion}
AppPublisher=Vox
AppPublisherURL=https://github.com/Muzammil-Noor/vox
AppSupportURL=https://github.com/Muzammil-Noor/vox/issues
DefaultDirName={autopf}\Vox
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
OutputDir=..\dist
OutputBaseFilename=vox-setup-{#AppVersion}
SetupIconFile=vox.ico
UninstallDisplayIcon={app}\vox.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ChangesEnvironment=yes

[Tasks]
Name: "addtopath"; Description: "Add Vox to the PATH, so ""vox file.vox"" works in any terminal"; GroupDescription: "Command line:"

[Files]
Source: "..\dist\vox\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Messages]
FinishedLabel=Vox is installed.%n%nOpen a new terminal and run:%n%n    vox file.vox%n%nTerminals that were already open do not see the new PATH until they are reopened.

[Code]
{ The PATH lives in a different key for a per-user and a machine-wide install. }
procedure PathKey(var Root: Integer; var Key: String);
begin
  if IsAdminInstallMode then begin
    Root := HKEY_LOCAL_MACHINE;
    Key := 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment';
  end else begin
    Root := HKEY_CURRENT_USER;
    Key := 'Environment';
  end;
end;

{ 1-based position of Dir as a whole ;-separated entry of Path, or 0. }
function PathEntryPos(const Path, Dir: String): Integer;
begin
  Result := Pos(';' + Uppercase(Dir) + ';', ';' + Uppercase(Path) + ';');
end;

procedure AddToPath(const Dir: String);
var
  Root: Integer;
  Key, Path: String;
begin
  PathKey(Root, Key);
  if not RegQueryStringValue(Root, Key, 'Path', Path) then Path := '';
  if PathEntryPos(Path, Dir) > 0 then exit;
  if (Path <> '') and (Path[Length(Path)] <> ';') then Path := Path + ';';
  RegWriteExpandStringValue(Root, Key, 'Path', Path + Dir);
end;

{ Removes exactly the entry and one separator, leaving everything else as it was. }
procedure RemoveFromPath(const Dir: String);
var
  Root, P, L: Integer;
  Key, Path: String;
begin
  PathKey(Root, Key);
  if not RegQueryStringValue(Root, Key, 'Path', Path) then exit;
  P := PathEntryPos(Path, Dir);
  if P = 0 then exit;
  L := Length(Dir);
  if (P + L <= Length(Path)) and (Path[P + L] = ';') then
    Delete(Path, P, L + 1)
  else if P > 1 then
    Delete(Path, P - 1, L + 1)
  else
    Delete(Path, P, L);
  RegWriteExpandStringValue(Root, Key, 'Path', Path);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('addtopath') then
    AddToPath(ExpandConstant('{app}'));
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    RemoveFromPath(ExpandConstant('{app}'));
end;
