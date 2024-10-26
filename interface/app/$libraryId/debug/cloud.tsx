import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { Suspense, useMemo } from 'react';
import {
	auth,
	CloudInstance,
	CloudLibrary,
	HardwareModel,
	useLibraryContext,
	useLibraryMutation,
	useLibraryQuery
} from '@sd/client';
import { Button, Card, Loader, tw } from '@sd/ui';
import { Icon } from '~/components';
import { AuthRequiredOverlay } from '~/components/AuthRequiredOverlay';
import { LoginButton } from '~/components/LoginButton';
import { useLocale, useRouteTitle } from '~/hooks';
import { hardwareModelToIcon } from '~/util/hardware';

const DataBox = tw.div`max-w-[300px] rounded-md border border-app-line/50 bg-app-lightBox/20 p-2`;
const Count = tw.div`min-w-[20px] flex h-[20px] px-1 items-center justify-center rounded-full border border-app-button/40 text-[9px]`;

export const Component = () => {
	useRouteTitle('Cloud');

	const authState = auth.useStateSnapshot();

	const authSensitiveChild = () => {
		if (authState.status === 'loggedIn') return <Authenticated />;
		if (authState.status === 'notLoggedIn' || authState.status === 'loggingIn')
			return (
				<div className="flex size-full items-center justify-center">
					<DataBox className="flex flex-col items-center gap-5 !p-6">
						<div className="flex flex-col items-center gap-1">
							<Icon name="Sync" size={60} />
							<p className="max-w-[75%] text-center text-sm">
								To access cloud related features, please login
							</p>
						</div>
						<LoginButton />
					</DataBox>
				</div>
			);

		return null;
	};

	return <div className="flex size-full flex-col items-start p-4">{authSensitiveChild()}</div>;
};

// million-ignore
function Authenticated() {
	const { library } = useLibraryContext();
	const cloudLibrary = useLibraryQuery(['cloud.library.get'], { suspense: true, retry: false });
	const createLibrary = useLibraryMutation(['cloud.library.create']);
	const { t } = useLocale();

	const thisInstance = useMemo(() => {
		if (!cloudLibrary.data) return undefined;
		return cloudLibrary.data.instances.find(
			(instance) => instance.uuid === library.instance_id
		);
	}, [cloudLibrary.data, library.instance_id]);

	return (
		<Suspense
			fallback={
				<div className="flex size-full items-center justify-center">
					<Loader />
				</div>
			}
		>
			{cloudLibrary.data ? (
				<div className="flex flex-col items-start gap-10">
					<Library thisInstance={thisInstance} cloudLibrary={cloudLibrary.data} />
					{thisInstance && <ThisInstance instance={thisInstance} />}
					<Instances instances={cloudLibrary.data.instances} />
				</div>
			) : (
				<div className="relative flex size-full flex-col items-center justify-center">
					<AuthRequiredOverlay />
					<DataBox className="flex min-w-[400px] flex-col items-center gap-5 p-6">
						<div className="flex flex-col items-center gap-2">
							<Icon name="CloudSync" size={60} />
							<p className="max-w-[60%] text-center text-sm text-ink">
								{t('cloud_connect_description')}
							</p>
						</div>
						<Button
							className="h-8"
							disabled={createLibrary.isPending}
							variant="accent"
							onClick={() => {
								createLibrary.mutateAsync(null);
							}}
						>
							{createLibrary.isPending ? (
								<div className="flex h-4 flex-row items-center gap-2">
									<Loader className="w-5" color="white" />
									<p className="text-xs">{t('connecting' + '...')}</p>
								</div>
							) : (
								t('connect')
							)}
						</Button>
					</DataBox>
				</div>
			)}
		</Suspense>
	);
}

// million-ignore
const Instances = ({ instances }: { instances: CloudInstance[] }) => {
	const { library } = useLibraryContext();
	const filteredInstances = instances.filter((instance) => instance.uuid !== library.instance_id);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-row items-center gap-3">
				<p className="text-medium font-bold">Instances</p>
				<Count>{filteredInstances.length}</Count>
			</div>
			<div className="flex flex-row flex-wrap gap-2">
				{filteredInstances.map((instance) => (
					<Card
						key={instance.id}
						className="flex-col items-center gap-4 bg-app-box/50 !p-5"
					>
						<div className="flex flex-col items-center gap-2">
							<Icon
								name={
									hardwareModelToIcon(
										instance.metadata.device_model as HardwareModel
									) as any
								}
								size={70}
							/>
							<p className="max-w-[250px] truncate text-xs font-medium">
								{instance.metadata.name}
							</p>
						</div>
						<div className="flex flex-col gap-1.5">
							<DataBox>
								<p className="truncate text-xs font-medium">
									Id:{' '}
									<span className="font-normal text-ink-dull">{instance.id}</span>
								</p>
							</DataBox>
							<DataBox>
								<p className="truncate text-xs font-medium">
									UUID:{' '}
									<span className="font-normal text-ink-dull">
										{instance.uuid}
									</span>
								</p>
							</DataBox>
							<DataBox>
								<p className="truncate text-xs font-medium">
									Public Key:{' '}
									<span className="font-normal text-ink-dull">
										{instance.identity}
									</span>
								</p>
							</DataBox>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
};

interface LibraryProps {
	cloudLibrary: CloudLibrary;
	thisInstance: CloudInstance | undefined;
}

// million-ignore
const Library = ({ thisInstance, cloudLibrary }: LibraryProps) => {
	const syncLibrary = useLibraryMutation(['cloud.library.sync']);
	return (
		<div className="flex flex-col gap-3">
			<p className="text-medium font-bold">Library</p>
			<Card className="flex-row items-center gap-6 !px-2">
				<p className="font-medium">
					Name: <span className="font-normal text-ink-dull">{cloudLibrary.name}</span>
				</p>
				<Button
					disabled={syncLibrary.isPending || thisInstance !== undefined}
					variant={thisInstance === undefined ? 'accent' : 'gray'}
					className="flex flex-row items-center gap-1 !text-ink"
					onClick={() => syncLibrary.mutateAsync(null)}
				>
					{thisInstance === undefined ? (
						<XCircle weight="fill" size={15} className="text-red-400" />
					) : (
						<CheckCircle weight="fill" size={15} className="text-green-400" />
					)}
					{thisInstance === undefined ? 'Sync Library' : 'Library synced'}
				</Button>
			</Card>
		</div>
	);
};

interface ThisInstanceProps {
	instance: CloudInstance;
}

// million-ignore
const ThisInstance = ({ instance }: ThisInstanceProps) => {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-medium font-bold">This Instance</p>
			<Card className="flex-col items-center gap-4 bg-app-box/50 !p-5">
				<div className="flex flex-col items-center gap-2">
					<Icon
						name={
							hardwareModelToIcon(
								instance.metadata.device_model as HardwareModel
							) as any
						}
						size={70}
					/>
					<p className="max-w-[160px] truncate text-xs font-medium">
						{instance.metadata.name}
					</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<DataBox>
						<p className="truncate text-xs font-medium">
							Id: <span className="font-normal text-ink-dull">{instance.id}</span>
						</p>
					</DataBox>
					<DataBox>
						<p className="truncate text-xs font-medium">
							UUID: <span className="font-normal text-ink-dull">{instance.uuid}</span>
						</p>
					</DataBox>
					<DataBox>
						<p className="truncate text-xs font-medium">
							Public Key:{' '}
							<span className="font-normal text-ink-dull">{instance.identity}</span>
						</p>
					</DataBox>
				</div>
			</Card>
		</div>
	);
};
