import React from 'react';
import './Avatar.scss';
import { Avatar } from 'antd';
import { AvatarSize } from 'antd/lib/avatar/SizeContext';

interface CmrAvatarProps {
    icon?: React.ReactNode;
    shape?: 'circle' | 'square';
    size?: AvatarSize;
    gap?: number;
    src?: React.ReactNode;
    children?: React.ReactNode;
}

const CmrAvatar = (props: CmrAvatarProps) => {
    const { icon, shape, size, gap, src, children, ...rest } = props;

    return (
        <Avatar icon={icon} shape={shape} size={size} gap={gap} src={src} {...rest}>
            {children}
        </Avatar>
    );
};

export default CmrAvatar;
